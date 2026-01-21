import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    return NextResponse.json({
      ...evidence,
      summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
