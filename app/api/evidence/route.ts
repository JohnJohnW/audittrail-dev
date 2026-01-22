import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getQueryParam } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Parse repository filter from query params
    const repoIdsParam = getQueryParam(request.nextUrl, "repositoryIds");
    const repositoryIds = repoIdsParam
      ? repoIdsParam.split(",").filter((id) => id.trim().length > 0)
      : undefined;

    const evidence = await getComplianceEvidence(orgId, { repositoryIds });
    const summary = getEvidenceSummary(evidence.controls);

    return NextResponse.json({
      ...evidence,
      summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
