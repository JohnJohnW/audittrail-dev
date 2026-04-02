/**
 * Security Posture API (formerly CISO Dashboard)
 *
 * GET: posture trend (12-month), readiness score,
 * predicted audit outcome, critical risks panel.
 *
 * Simplified for $5/mo plan. breach cost modeling and AI summary removed.
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
import {
  calculateTransparentReadinessScore,
  calculateTransparentBreachCost,
} from "@/lib/calc-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError(
        "Security Posture dashboard requires a Pro subscription",
        403,
        "PRO_REQUIRED"
      );
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
    const frameworkScoreArray = calculateFrameworkScores(evidence);

    const noEvidenceControls = evidence.controls.filter((c) => c.status === "no_evidence").length;

    // Org profile for breach cost segmentation
    const orgProfile = await db.orgProfile.findUnique({ where: { orgId } }).catch(() => null);

    // Transparent readiness calculation
    const readinessCalc = await calculateTransparentReadinessScore(
      orgId,
      frameworkScoreArray,
      noEvidenceControls
    );

    const { readinessScore, predictedOutcome } = readinessCalc.value;

    // Breach cost estimate
    const breachCostCalc = await calculateTransparentBreachCost(orgId, {
      noEvidenceControls,
      companySize: orgProfile?.companySize ?? null,
      industry: orgProfile?.industry ?? null,
    }).catch(() => null);

    // Critical risks: open risk treatments
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

    return NextResponse.json({
      currentScore: summary.score,
      readinessScore,
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
      breachCost: breachCostCalc ? breachCostCalc.value : null,
      _calc: {
        readinessScore: readinessCalc,
        breachCost: breachCostCalc,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
