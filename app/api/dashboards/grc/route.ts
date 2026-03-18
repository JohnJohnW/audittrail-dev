/**
 * GRC Dashboard API
 *
 * GET: framework scorecards with delta, gap ownership table,
 * cross-framework coverage map, risk treatment summary.
 * Pro-gated. Cached 5min.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("GRC dashboard requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    // Current compliance state
    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);
    const frameworkScores = calculateFrameworkScores(evidence);

    // Score delta from 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const previousSnapshot = await db.complianceSnapshot.findFirst({
      where: {
        orgId,
        snapshotDate: { lte: sevenDaysAgo },
      },
      orderBy: { snapshotDate: "desc" },
    });
    const scoreDelta = previousSnapshot ? summary.score - previousSnapshot.overallScore : 0;

    // Gap assignments summary
    const gapAssignments = await db.gapAssignment.findMany({
      where: { orgId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    const openGaps = gapAssignments.filter((g) => g.status === "open").length;
    const resolvedGaps = gapAssignments.filter((g) => g.status === "resolved").length;

    // Risk treatment summary
    const treatments = await db.riskTreatment.groupBy({
      by: ["status"],
      where: { orgId },
      _count: { id: true },
    });

    const treatmentSummary: Record<string, number> = {};
    for (const t of treatments) {
      treatmentSummary[t.status] = t._count.id;
    }

    // Active audit cycles
    const activeAudits = await db.auditCycle.findMany({
      where: { orgId, status: { not: "closed" } },
      select: { id: true, frameworkName: true, status: true, targetCloseDate: true },
    });

    const result = {
      summary,
      scoreDelta,
      frameworkScores,
      gaps: {
        total: gapAssignments.length,
        open: openGaps,
        resolved: resolvedGaps,
        assignments: gapAssignments,
      },
      treatments: treatmentSummary,
      activeAudits,
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
