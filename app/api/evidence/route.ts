import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getQueryParam } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    logger.info("Evidence API request received");
    const { orgId } = await requireAuth();
    logger.info("Auth successful", { orgId });

    // Parse repository filter from query params
    // Use request.nextUrl.searchParams directly to avoid type issues
    const repoIdsParam = request.nextUrl.searchParams.get("repositoryIds");
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

    return NextResponse.json({
      ...evidence,
      summary,
    });
  } catch (error) {
    logger.error("Evidence API error", error);
    return handleApiError(error);
  }
}
