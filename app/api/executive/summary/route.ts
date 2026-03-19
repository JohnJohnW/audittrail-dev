import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary, enrichWithAgentEvidence } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Business impact calculations based on compliance posture
function calculateBusinessImpact(score: number, total: number, withEvidence: number) {
  const gapCount = total - withEvidence;
  const gapRatio = total > 0 ? gapCount / total : 0;

  // Breach cost estimate: ACSC avg AU$3.87M, scaled by gap ratio
  // Higher gaps = more exposure
  const baseBreach = 3_870_000;
  const breachExposure = Math.round(baseBreach * gapRatio * 0.7);

  // Regulatory fine estimate: OAIC/APRA fine range AU$50K-$50M
  // Scaled by control coverage gaps
  const maxFine = 10_000_000;
  const fineExposure = Math.round(maxFine * gapRatio * 0.4);

  // Deal-blocker risk: likelihood a partner/acquirer flags compliance gaps
  // >30% gap = high risk of blocking a deal or vendor approval
  const dealBlockerRisk =
    gapRatio > 0.5 ? "High" : gapRatio > 0.25 ? "Medium" : gapRatio > 0.1 ? "Low" : "Minimal";

  // Days to audit-ready: rough estimate based on current coverage
  // Each gap control needs ~1.5 days of evidence work on average
  const daysToAuditReady = Math.round(gapCount * 1.5);

  // Reputational score (0-100, inverse of gap)
  const reputationScore = Math.round(score);

  return {
    breachExposure,
    fineExposure,
    dealBlockerRisk,
    daysToAuditReady,
    reputationScore,
    gapCount,
    totalControls: total,
    coveredControls: withEvidence,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();
    logger.info("Executive summary API", { orgId });

    const [evidence, subscription, repositories] = await Promise.all([
      getComplianceEvidence(orgId),
      db.subscription.findUnique({ where: { orgId } }),
      db.repository.findMany({
        where: { orgId },
        select: { id: true, fullName: true, lastSyncedAt: true },
        orderBy: { lastSyncedAt: "desc" },
        take: 5,
      }),
    ]);

    const enrichedControls = await enrichWithAgentEvidence(orgId, evidence.controls);
    const summary = getEvidenceSummary(enrichedControls);

    // Per-framework breakdown
    const frameworkBreakdown = evidence.frameworks.map((fw) => {
      const controls = enrichedControls.filter((c) => c.frameworkName === fw.name);
      const fs = getEvidenceSummary(controls);
      return {
        name: fw.name,
        score: fs.score,
        total: fs.total,
        withEvidence: fs.withEvidence,
        gaps: fs.total - fs.withEvidence,
      };
    });

    // Top gaps (controls with no or limited evidence)
    const topGaps = enrichedControls
      .filter((c) => c.status === "no_evidence" || c.status === "partial" || c.status === "limited")
      .slice(0, 10)
      .map((c) => ({
        code: c.controlCode,
        name: c.controlTitle,
        framework: c.frameworkName,
        severity: c.status === "no_evidence" ? "missing" : "partial",
      }));

    const businessImpact = calculateBusinessImpact(
      summary.score,
      summary.total,
      summary.withEvidence
    );

    return NextResponse.json({
      posture: {
        score: summary.score,
        total: summary.total,
        withEvidence: summary.withEvidence,
        partial: summary.partial,
        noEvidence: summary.noEvidence,
        lastUpdated: new Date().toISOString(),
      },
      businessImpact,
      frameworkBreakdown,
      topGaps,
      subscription: { plan: subscription?.plan ?? "free" },
      repositories: repositories.map((r) => ({
        name: r.fullName,
        lastSync: r.lastSyncedAt,
      })),
    });
  } catch (error) {
    logger.error("Executive summary API error", error);
    return handleApiError(error);
  }
}
