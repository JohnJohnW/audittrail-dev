import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

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
