import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence } from "@/lib/compliance";
import { getGapRecommendation, getGapPriority } from "@/lib/gap-analysis";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/gaps
 * Returns all no_evidence + partial controls sorted by score impact (highest first).
 * This is the prioritised remediation roadmap.
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const evidence = await getComplianceEvidence(orgId);
    const gaps = evidence.controls.filter(
      (c) => c.status === "no_evidence" || c.status === "partial"
    );

    const totalControls = evidence.controls.length;

    const prioritised = gaps
      .map((control) => {
        const priority = getGapPriority(
          control.evidenceType,
          control.status as "partial" | "no_evidence" | "limited",
          totalControls
        );
        const recommendation = getGapRecommendation(
          control.controlCode,
          control.frameworkName,
          control.evidenceType,
          control.status
        );

        return {
          controlId: control.controlId,
          controlCode: control.controlCode,
          controlTitle: control.controlTitle,
          frameworkName: control.frameworkName,
          status: control.status,
          evidenceType: control.evidenceType,
          evidenceCount: control.evidenceCount,
          priority,
          recommendation,
        };
      })
      .sort((a, b) => b.priority.scoreImpact - a.priority.scoreImpact);

    return NextResponse.json({
      totalControls,
      gapCount: prioritised.length,
      totalScoreAtRisk: parseFloat(
        prioritised.reduce((sum, g) => sum + g.priority.scoreImpact, 0).toFixed(1)
      ),
      gaps: prioritised,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
