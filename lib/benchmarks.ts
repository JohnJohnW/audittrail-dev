/**
 * Industry Benchmark Computation — Data Flywheel
 *
 * Aggregates anonymised compliance scores across all organisations and stores
 * per-cohort benchmarks. Called nightly by the cron sync route.
 *
 * Privacy guarantee: only cohorts with ≥ MINIMUM_COHORT_SIZE organisations
 * are written to the database — individual org data is never exposed.
 */

import { db } from "./db";
import { logger } from "./logger";

const MINIMUM_COHORT_SIZE = 5;

export async function computeIndustryBenchmarks(): Promise<void> {
  try {
    logger.info("Starting industry benchmark computation");

    // Only orgs with a complete profile (industry + companySize) contribute
    const profiles = await db.orgProfile.findMany({
      where: {
        industry: { not: null },
        companySize: { not: null },
      },
      select: { orgId: true, industry: true, companySize: true },
    });

    if (profiles.length === 0) {
      logger.info("No org profiles available for benchmark computation");
      return;
    }

    // Fetch latest snapshots for qualifying orgs
    const orgIds = profiles.map((p) => p.orgId);
    const latestSnapshots = await db.complianceSnapshot.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { snapshotDate: "desc" },
      distinct: ["orgId"],
    });

    const snapshotByOrg = new Map(latestSnapshots.map((s) => [s.orgId, s]));

    // Group by (framework, industry, companySize)
    type CohortKey = string;
    type ControlScores = Map<string, number[]>; // controlCode → [0|0.5|1, ...]
    type FrameworkData = {
      industry: string | null;
      companySize: string | null;
      scores: Map<string, ControlScores>; // frameworkName → controlCode → values
      overallScores: number[];
    };

    const cohorts = new Map<CohortKey, FrameworkData>();

    for (const profile of profiles) {
      const snapshot = snapshotByOrg.get(profile.orgId);
      if (!snapshot?.frameworkScores) continue;

      const frameworkScores = snapshot.frameworkScores as Record<
        string,
        { score: number; total: number; withEvidence: number }
      >;

      const cohortKey = `${profile.industry}::${profile.companySize}`;
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, {
          industry: profile.industry,
          companySize: profile.companySize,
          scores: new Map(),
          overallScores: [],
        });
      }

      const cohort = cohorts.get(cohortKey)!;
      cohort.overallScores.push(snapshot.overallScore);

      for (const [framework, data] of Object.entries(frameworkScores)) {
        if (!cohort.scores.has(framework)) {
          cohort.scores.set(framework, new Map());
        }
        const frameworkMap = cohort.scores.get(framework)!;
        // Use passRate from withEvidence / total as the per-framework control score
        const passRate = data.total > 0 ? data.withEvidence / data.total : 0;
        const existing = frameworkMap.get("__overall__") ?? [];
        existing.push(passRate);
        frameworkMap.set("__overall__", existing);
      }
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let benchmarksWritten = 0;

    for (const [, cohort] of Array.from(cohorts)) {
      const sampleCount = cohort.overallScores.length;
      if (sampleCount < MINIMUM_COHORT_SIZE) continue; // Privacy floor

      for (const [framework, controlMap] of Array.from(cohort.scores)) {
        const overallValues = controlMap.get("__overall__") ?? [];
        if (overallValues.length < MINIMUM_COHORT_SIZE) continue;

        const sorted = [...overallValues].sort((a, b) => a - b);
        const avgScore =
          (overallValues.reduce((s: number, v: number) => s + v, 0) / overallValues.length) * 100;
        const passRate = overallValues.filter((v: number) => v >= 1).length / overallValues.length;
        const p25 = (percentile(sorted, 25) ?? 0) * 100;
        const p50 = (percentile(sorted, 50) ?? 0) * 100;
        const p75 = (percentile(sorted, 75) ?? 0) * 100;

        // Prisma nullable-unique workaround: use deleteMany + create
        await db.industryBenchmark.deleteMany({
          where: {
            framework,
            industry: cohort.industry,
            companySize: cohort.companySize,
            controlCode: "__overall__",
            computedAt: today,
          },
        });
        await db.industryBenchmark.create({
          data: {
            framework,
            industry: cohort.industry,
            companySize: cohort.companySize,
            controlCode: "__overall__",
            passRate,
            avgScore,
            p25,
            p50,
            p75,
            sampleCount,
            computedAt: today,
          },
        });
        benchmarksWritten++;
      }
    }

    logger.info(`Benchmark computation complete: ${benchmarksWritten} entries written`);
  } catch (error) {
    logger.error("Benchmark computation error", error);
    // Never throw — benchmark failures must not affect cron sync
  }
}

/** Get benchmark percentile for an org's score vs its cohort */
export async function getOrgBenchmarkPercentile(
  orgId: string,
  framework: string
): Promise<{
  orgScore: number;
  p25: number;
  p50: number;
  p75: number;
  percentile: number;
  sampleCount: number;
} | null> {
  const profile = await db.orgProfile.findUnique({ where: { orgId } });
  if (!profile?.industry || !profile.companySize) return null;

  const snapshot = await db.complianceSnapshot.findFirst({
    where: { orgId },
    orderBy: { snapshotDate: "desc" },
  });
  if (!snapshot) return null;

  const frameworkScores = snapshot.frameworkScores as Record<
    string,
    { score: number; total: number; withEvidence: number }
  > | null;
  const orgScore = frameworkScores?.[framework]?.score ?? snapshot.overallScore;

  // Try exact cohort, then industry-only fallback
  let benchmark = await db.industryBenchmark.findFirst({
    where: {
      framework,
      industry: profile.industry,
      companySize: profile.companySize,
      controlCode: "__overall__",
    },
    orderBy: { computedAt: "desc" },
  });

  if (!benchmark) {
    benchmark = await db.industryBenchmark.findFirst({
      where: {
        framework,
        industry: profile.industry,
        companySize: null,
        controlCode: "__overall__",
      },
      orderBy: { computedAt: "desc" },
    });
  }

  if (!benchmark) return null;

  // Estimate percentile: linear interpolation between p25/p50/p75
  const pctile = estimatePercentile(orgScore, benchmark.p25, benchmark.p50, benchmark.p75);

  return {
    orgScore,
    p25: benchmark.p25,
    p50: benchmark.p50,
    p75: benchmark.p75,
    percentile: pctile,
    sampleCount: benchmark.sampleCount,
  };
}

// ============================================================
// Math helpers
// ============================================================

function percentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function estimatePercentile(value: number, p25: number, p50: number, p75: number): number {
  if (value <= p25) return Math.round((value / p25) * 25);
  if (value <= p50) return Math.round(25 + ((value - p25) / (p50 - p25 || 1)) * 25);
  if (value <= p75) return Math.round(50 + ((value - p50) / (p75 - p50 || 1)) * 25);
  return Math.round(75 + Math.min(((value - p75) / (100 - p75 || 1)) * 25, 25));
}
