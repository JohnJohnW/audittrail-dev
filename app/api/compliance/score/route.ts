import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { getCached, getCacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    logger.info("Compliance score API request received");
    const { orgId } = await requireAuth();
    logger.info("Auth successful", { orgId });

    // Parse repository filter from query params
    const repoIdsParam = request.nextUrl.searchParams.get("repositoryIds");
    const repositoryIds = repoIdsParam
      ? repoIdsParam.split(",").filter((id) => id.trim().length > 0)
      : undefined;

    logger.info("Fetching compliance evidence", { orgId, repositoryIds });
    const evidenceCacheKey = getCacheKey(
      "evidence",
      orgId,
      ...(repositoryIds?.slice().sort() ?? [])
    );
    const evidence = await getCached(
      evidenceCacheKey,
      () => getComplianceEvidence(orgId, { repositoryIds }),
      300 // 5-minute TTL; shared key with evidence route - one warms the other
    );
    logger.info("Evidence fetched", {
      frameworkCount: evidence.frameworks.length,
      controlCount: evidence.controls.length,
    });

    const summary = getEvidenceSummary(evidence.controls);
    logger.info("Summary calculated", { summary });

    // Per-framework scores (shared helper - O(n) grouping)
    const byFramework = calculateFrameworkScores(evidence);

    // Calculate scores by category
    const controlsByCategory = new Map<string, typeof evidence.controls>();
    for (const control of evidence.controls) {
      const existing = controlsByCategory.get(control.evidenceType) || [];
      existing.push(control);
      controlsByCategory.set(control.evidenceType, existing);
    }
    const categories = ["commit_history", "pr_approvals", "branch_protection", "agent_activity"];
    const byCategory = categories.map((category) => {
      const categoryControls = controlsByCategory.get(category) || [];
      const categorySummary = getEvidenceSummary(categoryControls);
      return {
        category: category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        score: categorySummary.score,
      };
    });

    return NextResponse.json({
      overall: summary.score,
      overallSummary: {
        total: summary.total,
        withEvidence: summary.withEvidence,
        partial: summary.partial,
        limited: summary.limited,
        noEvidence: summary.noEvidence,
      },
      byFramework,
      byCategory,
    });
  } catch (error) {
    logger.error("Compliance score API error", error);
    return handleApiError(error);
  }
}
