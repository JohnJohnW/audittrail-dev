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
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
import {
  calculateTransparentBreachCost,
  calculateTransparentReadinessScore,
  calculateTransparentGapPriority,
} from "@/lib/calc-engine";

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
    const frameworkScoreArray = calculateFrameworkScores(evidence);

    // Gap controls
    const noEvidenceControls = evidence.controls.filter((c) => c.status === "no_evidence").length;
    const gapControls = evidence.controls
      .filter((c) => c.status === "no_evidence")
      .map((c) => ({
        controlCode: c.controlCode,
        controlName: c.controlTitle,
        frameworkName: c.frameworkName,
      }));

    // Benchmark: use org profile industry if available
    const orgProfile = await db.orgProfile.findUnique({
      where: { orgId },
      select: { industry: true, companySize: true },
    });

    // --- Transparent Calculations via Calc Engine ---
    const [breachCalc, readinessCalc, gapCalc] = await Promise.all([
      calculateTransparentBreachCost(orgId, {
        noEvidenceControls,
        companySize: orgProfile?.companySize,
        industry: orgProfile?.industry,
      }),
      calculateTransparentReadinessScore(orgId, frameworkScoreArray, noEvidenceControls),
      calculateTransparentGapPriority(orgId, gapControls),
    ]);

    const { readinessScore, dealBlockerRisk, daysToAuditReady, predictedOutcome } =
      readinessCalc.value;
    const {
      estimate: breachCostEstimate,
      sizeMultiplier: sizeMult,
      industryMultiplier: industryMult,
      gapMultiplier: gapSeverityMultiplier,
      sizeKey,
      industryKey,
    } = breachCalc.value;

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

    // Regulatory fine exposure: based on active frameworks
    const activeFrameworkNames = frameworkScoreArray.map((f) => f.framework);
    let maxFineEstimate = 0;
    const fineBreakdown: { framework: string; maxFine: string; basis: string }[] = [];
    if (activeFrameworkNames.some((f) => f.includes("GDPR"))) {
      const gdprFine = Math.round(breachCalc.value.baseline * 0.4 * industryMult);
      maxFineEstimate = Math.max(maxFineEstimate, gdprFine);
      fineBreakdown.push({
        framework: "GDPR",
        maxFine: `AUD $${(gdprFine / 1_000_000).toFixed(1)}M`,
        basis: "4% global annual turnover (Art. 83 max)",
      });
    }
    if (activeFrameworkNames.some((f) => f.includes("PCI"))) {
      const pciFine = 165_000 * 12; // USD $100K converted to AUD at ~1.65
      maxFineEstimate = Math.max(maxFineEstimate, pciFine);
      fineBreakdown.push({
        framework: "PCI DSS",
        maxFine: `AUD $${(pciFine / 1_000).toFixed(0)}K/yr`,
        basis: "USD $100K/month max converted to AUD",
      });
    }
    if (activeFrameworkNames.some((f) => f.includes("SOCI"))) {
      fineBreakdown.push({
        framework: "SOCI Act",
        maxFine: "AUD $50M+",
        basis:
          "Critical infrastructure civil penalty (Security of Critical Infrastructure Act 2018)",
      });
    }
    if (activeFrameworkNames.some((f) => f.includes("Privacy") || f.includes("Australian"))) {
      fineBreakdown.push({
        framework: "Privacy Act",
        maxFine: "AUD $50M",
        basis: "Privacy and Other Legislation Amendment Act 2024 — max penalty",
      });
    }
    if (fineBreakdown.length === 0) {
      fineBreakdown.push({
        framework: "General",
        maxFine: "Contract/deal loss",
        basis: "No direct regulatory fine for active frameworks",
      });
    }

    const businessImpact = {
      breachCostEstimate,
      breachCostBasis: {
        baseline:
          "AUD $4.26M (IBM Cost of a Data Breach 2024, Australian cohort — Ponemon Institute methodology)",
        secondarySource:
          "ASD Annual Cyber Threat Report 2024-25: AUD $202,700 avg self-reported loss for large business (ReportCyber, Oct 2025)",
        notificationVolume:
          "1,113 breaches notified in Australia in 2024 (OAIC Notifiable Data Breaches Scheme)",
        sizeMultiplier: sizeMult,
        industryMultiplier: industryMult,
        gapMultiplier: gapSeverityMultiplier,
        sizeUsed: sizeKey,
        industryUsed: industryKey,
        note: "Each unmitigated gap adds 4% — IBM AU 2024: orgs with AI/automation saved AUD $1.74M per breach on average",
      },
      regulatoryFineBreakdown: fineBreakdown,
      maxFineEstimate,
      dealBlockerRisk,
      dealBlockerBasis: {
        readinessScore,
        noEvidenceControls,
        thresholds: "high: score<50 or gaps>5 | medium: score<75 or gaps>2 | low: otherwise",
      },
      daysToAuditReady,
      daysToAuditReadyBasis: {
        readinessScore,
        method: "Empirical estimate: 4 hrs/gap remediation + evidence collection buffer",
      },
    };

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
      industry: orgProfile?.industry || null,
      companySize: orgProfile?.companySize || null,
      businessImpact,
      _calc: {
        breachCost: breachCalc,
        readinessScore: readinessCalc,
        gapPriority: gapCalc,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
