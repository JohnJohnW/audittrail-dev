/**
 * CISO Dashboard API
 *
 * GET: posture trend (12-month), benchmark percentile,
 * predicted audit outcome, critical risks panel.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("CISO dashboard requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    // 12-month posture trend
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const snapshots = await db.complianceSnapshot.findMany({
      where: {
        orgId,
        snapshotDate: { gte: twelveMonthsAgo },
      },
      orderBy: { snapshotDate: "asc" },
      select: {
        snapshotDate: true,
        overallScore: true,
        totalControls: true,
        withEvidence: true,
        frameworkScores: true,
      },
    });

    // Current state
    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    // Critical risks: open risk treatments with no evidence
    const criticalRisks = await db.riskTreatment.findMany({
      where: {
        orgId,
        status: { in: ["open", "overdue"] },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Active audit status
    const activeAudit = await db.auditCycle.findFirst({
      where: { orgId, status: { not: "closed" } },
      include: {
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Predict audit outcome: weighted gap score
    const noEvidenceControls = evidence.controls.filter((c) => c.status === "no_evidence").length;
    const predictedOutcome =
      noEvidenceControls === 0
        ? "likely_pass"
        : noEvidenceControls <= 3
          ? "pass_with_findings"
          : "at_risk";

    // Benchmark: use org profile industry if available
    const orgProfile = await db.orgProfile.findUnique({
      where: { orgId },
      select: { industry: true, companySize: true },
    });

    return NextResponse.json({
      currentScore: summary.score,
      postureTrend: snapshots,
      summary,
      criticalRisks,
      activeAudit: activeAudit
        ? {
            id: activeAudit.id,
            framework: activeAudit.frameworkName,
            status: activeAudit.status,
            findingCount: activeAudit._count.findings,
            targetCloseDate: activeAudit.targetCloseDate,
          }
        : null,
      predictedOutcome,
      industry: orgProfile?.industry || null,
      companySize: orgProfile?.companySize || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
