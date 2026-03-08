import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getOrgBenchmarkPercentile } from "@/lib/benchmarks";
import { getComplianceEvidence, calculateFrameworkScores } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/benchmarks
 * Returns benchmark percentile position for this org vs. similar orgs, per framework.
 * Response: { benchmarks: Array<{ framework, orgScore, p25, p50, p75, percentile, sampleCount }> }
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Get the org's current framework scores
    const evidence = await getComplianceEvidence(orgId);
    const frameworkScores = calculateFrameworkScores(evidence);

    // Fetch benchmark percentile for each framework in parallel
    const benchmarks = await Promise.all(
      frameworkScores.map(async ({ framework, score }) => {
        const benchmark = await getOrgBenchmarkPercentile(orgId, framework);

        if (!benchmark) {
          return {
            framework,
            orgScore: score,
            p25: null,
            p50: null,
            p75: null,
            percentile: null,
            sampleCount: null,
          };
        }

        return {
          framework,
          orgScore: score,
          p25: benchmark.p25,
          p50: benchmark.p50,
          p75: benchmark.p75,
          percentile: benchmark.percentile,
          sampleCount: benchmark.sampleCount,
        };
      })
    );

    return NextResponse.json({ benchmarks });
  } catch (error) {
    return handleApiError(error);
  }
}
