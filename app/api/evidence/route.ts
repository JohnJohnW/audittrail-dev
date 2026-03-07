import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError, AppError } from "@/lib/error-handler";
import { isValidCuid } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    logger.info("Evidence API request received");
    const { orgId } = await requireAuth();
    logger.info("Auth successful", { orgId });

    // Parse and validate repository filter from query params
    const repoIdsParam = request.nextUrl.searchParams.get("repositoryIds");
    const repositoryIds = repoIdsParam
      ? repoIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    // Reject any IDs that aren't valid CUIDs to prevent injection / unexpected DB queries
    if (repositoryIds && !repositoryIds.every(isValidCuid)) {
      throw new AppError("Invalid repositoryId format", 400, "INVALID_ID");
    }

    logger.info("Fetching compliance evidence", { orgId, repositoryIds });
    const evidence = await getComplianceEvidence(orgId, { repositoryIds });
    logger.info("Evidence fetched", {
      frameworkCount: evidence.frameworks.length,
      controlCount: evidence.controls.length,
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
