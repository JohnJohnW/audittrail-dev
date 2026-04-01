/**
 * Transparent Readiness Score Calculator
 *
 * Wraps the weighted framework average with full calculation transparency.
 */

import { loadOrgConfig, getFrameworkWeight } from "./config";
import { DEFAULTS } from "./defaults";
import type { CalcResult, CalcStep } from "./types";

export interface FrameworkScore {
  framework: string;
  score: number;
  total: number;
  withEvidence: number;
}

export interface ReadinessScoreResult {
  readinessScore: number;
  frameworkScores: FrameworkScore[];
  dealBlockerRisk: "low" | "medium" | "high";
  daysToAuditReady: { min: number; max: number; label: string };
  predictedOutcome: "likely_pass" | "pass_with_findings" | "at_risk";
}

export async function calculateTransparentReadinessScore(
  orgId: string,
  frameworkScores: FrameworkScore[],
  noEvidenceControls: number
): Promise<CalcResult<ReadinessScoreResult>> {
  const config = await loadOrgConfig(orgId);
  const steps: CalcStep[] = [];
  const warnings: string[] = [];
  let anyConfiguredWeight = false;

  // Weighted average across frameworks
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { framework, score } of frameworkScores) {
    const { value: weight, isDefault } = getFrameworkWeight(config, framework);
    if (!isDefault) anyConfiguredWeight = true;

    steps.push({
      label: `Framework: ${framework}`,
      value: `score ${score} × weight ${weight}`,
      source: isDefault ? "default" : "configured",
      recommendation: isDefault ? DEFAULTS.scoring.frameworkWeightsRecommendation : undefined,
    });

    weightedSum += score * weight;
    totalWeight += weight;
  }

  const readinessScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  steps.push({
    label: "Readiness score",
    value: `(${weightedSum.toFixed(1)} weighted points) / ${totalWeight.toFixed(1)} total weight = ${readinessScore}`,
    source: "computed",
  });

  // Deal-blocker risk
  const dealBlocker = {
    highScoreThreshold:
      config.auditReadiness?.dealBlocker?.highScoreThreshold ??
      DEFAULTS.auditReadiness.dealBlocker.highScoreThreshold,
    highGapThreshold:
      config.auditReadiness?.dealBlocker?.highGapThreshold ??
      DEFAULTS.auditReadiness.dealBlocker.highGapThreshold,
    mediumScoreThreshold:
      config.auditReadiness?.dealBlocker?.mediumScoreThreshold ??
      DEFAULTS.auditReadiness.dealBlocker.mediumScoreThreshold,
    mediumGapThreshold:
      config.auditReadiness?.dealBlocker?.mediumGapThreshold ??
      DEFAULTS.auditReadiness.dealBlocker.mediumGapThreshold,
  };
  const dealBlockerIsDefault = config.auditReadiness?.dealBlocker?.highScoreThreshold === undefined;

  const dealBlockerRisk: "low" | "medium" | "high" =
    readinessScore < dealBlocker.highScoreThreshold ||
    noEvidenceControls > dealBlocker.highGapThreshold
      ? "high"
      : readinessScore < dealBlocker.mediumScoreThreshold ||
          noEvidenceControls > dealBlocker.mediumGapThreshold
        ? "medium"
        : "low";

  steps.push({
    label: "Deal-blocker risk",
    value: dealBlockerRisk,
    source: dealBlockerIsDefault ? "default" : "configured",
    recommendation: dealBlockerIsDefault
      ? DEFAULTS.auditReadiness.dealBlockerRecommendation
      : undefined,
  });

  // Predicted outcome
  const outcomeThresholds = {
    passMaxGaps:
      config.auditReadiness?.predictedOutcome?.passMaxGaps ??
      DEFAULTS.auditReadiness.predictedOutcome.passMaxGaps,
    passWithFindingsMaxGaps:
      config.auditReadiness?.predictedOutcome?.passWithFindingsMaxGaps ??
      DEFAULTS.auditReadiness.predictedOutcome.passWithFindingsMaxGaps,
  };
  const outcomeIsDefault = config.auditReadiness?.predictedOutcome?.passMaxGaps === undefined;

  const predictedOutcome: "likely_pass" | "pass_with_findings" | "at_risk" =
    noEvidenceControls <= outcomeThresholds.passMaxGaps
      ? "likely_pass"
      : noEvidenceControls <= outcomeThresholds.passWithFindingsMaxGaps
        ? "pass_with_findings"
        : "at_risk";

  steps.push({
    label: "Predicted audit outcome",
    value: predictedOutcome,
    source: outcomeIsDefault ? "default" : "configured",
    recommendation: outcomeIsDefault
      ? DEFAULTS.auditReadiness.predictedOutcomeRecommendation
      : undefined,
  });

  // Days to audit-ready
  const thresholds = config.auditReadiness?.thresholds ?? DEFAULTS.auditReadiness.thresholds;
  const thresholdsIsDefault = config.auditReadiness?.thresholds === undefined;
  const matchedThreshold =
    thresholds.find((t) => readinessScore >= t.minScore) ?? thresholds[thresholds.length - 1];
  const daysToAuditReady = {
    min: matchedThreshold.min,
    max: matchedThreshold.max,
    label: matchedThreshold.label,
  };

  steps.push({
    label: "Days to audit-ready",
    value: matchedThreshold.label,
    source: thresholdsIsDefault ? "default" : "configured",
    recommendation: thresholdsIsDefault
      ? DEFAULTS.auditReadiness.thresholdsRecommendation
      : undefined,
  });

  if (frameworkScores.length === 0) {
    warnings.push("No active frameworks found — readiness score defaults to 0.");
  }

  return {
    value: {
      readinessScore,
      frameworkScores,
      dealBlockerRisk,
      daysToAuditReady,
      predictedOutcome,
    },
    methodology:
      "Weighted average of per-framework compliance scores; SOC 2 and ISO 27001 weighted 1.5× by default",
    formula: `sum(frameworkScore × weight) / sum(weights)`,
    steps,
    inputs: { frameworkCount: frameworkScores.length, noEvidenceControls },
    warnings,
    isDefault:
      !anyConfiguredWeight && dealBlockerIsDefault && outcomeIsDefault && thresholdsIsDefault,
  };
}
