import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getQueryParam } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    logger.info("Compliance score API request received");
    const { orgId } = await requireAuth();
    logger.info("Auth successful", { orgId });

    // Parse repository filter from query params
    const repoIdsParam = getQueryParam(request.nextUrl, "repositoryIds");
    const repositoryIds = repoIdsParam
      ? repoIdsParam.split(",").filter((id) => id.trim().length > 0)
      : undefined;

    logger.info("Fetching compliance evidence", { orgId, repositoryIds });
    const evidence = await getComplianceEvidence(orgId, { repositoryIds });
    logger.info("Evidence fetched", { 
      frameworkCount: evidence.frameworks.length,
      controlCount: evidence.controls.length 
    });

    const summary = getEvidenceSummary(evidence.controls);
    logger.info("Summary calculated", { summary });

    // Pre-group controls by framework for O(n) instead of O(n*m) filtering
    const controlsByFramework = new Map<string, typeof evidence.controls>();
    for (const control of evidence.controls) {
      const existing = controlsByFramework.get(control.frameworkName) || [];
      existing.push(control);
      controlsByFramework.set(control.frameworkName, existing);
    }

    // Pre-group controls by evidence type for O(n) instead of O(n*m) filtering
    const controlsByCategory = new Map<string, typeof evidence.controls>();
    for (const control of evidence.controls) {
      const existing = controlsByCategory.get(control.evidenceType) || [];
      existing.push(control);
      controlsByCategory.set(control.evidenceType, existing);
    }

    // Calculate scores by framework using pre-grouped data
    const byFramework = evidence.frameworks.map((framework) => {
      const frameworkControls = controlsByFramework.get(framework.name) || [];
      const frameworkSummary = getEvidenceSummary(frameworkControls);
      return {
        framework: framework.name,
        score: frameworkSummary.score,
        total: frameworkSummary.total,
        withEvidence: frameworkSummary.withEvidence,
      };
    });

    // Calculate scores by category using pre-grouped data
    const categories = ["commit_history", "pr_approvals", "branch_protection"];
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
