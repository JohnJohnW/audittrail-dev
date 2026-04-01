/**
 * Transparent Breach Cost Calculator
 *
 * Wraps the IBM-sourced breach cost model with full calculation transparency.
 */

import { loadOrgConfig } from "./config";
import { DEFAULTS } from "./defaults";
import type { CalcResult, CalcStep } from "./types";

export interface BreachCostInputs {
  noEvidenceControls: number;
  companySize?: string | null;
  industry?: string | null;
}

export interface BreachCostResult {
  estimate: number;
  baseline: number;
  sizeMultiplier: number;
  industryMultiplier: number;
  gapMultiplier: number;
  sizeKey: string;
  industryKey: string;
}

export async function calculateTransparentBreachCost(
  orgId: string,
  inputs: BreachCostInputs
): Promise<CalcResult<BreachCostResult>> {
  const config = await loadOrgConfig(orgId);
  const steps: CalcStep[] = [];
  const warnings: string[] = [];

  // Resolve baseline
  const baseline = config.businessImpact?.breachBaseline ?? DEFAULTS.businessImpact.breachBaseline;
  const baselineIsDefault = config.businessImpact?.breachBaseline === undefined;

  steps.push({
    label: "Breach cost baseline",
    value: `AUD $${(baseline / 1_000_000).toFixed(2)}M`,
    source: baselineIsDefault ? "default" : "configured",
    citation: baselineIsDefault ? DEFAULTS.businessImpact.breachBaselineCitation : undefined,
    recommendation: baselineIsDefault
      ? DEFAULTS.businessImpact.breachBaselineRecommendation
      : undefined,
  });

  // Resolve size multiplier
  const sizeKey = inputs.companySize || "51-200";
  const companySizeMultipliers =
    config.businessImpact?.companySizeMultipliers ?? DEFAULTS.businessImpact.companySizeMultipliers;
  const sizeMult = companySizeMultipliers[sizeKey] ?? 1.0;

  steps.push({
    label: "Company size multiplier",
    value: sizeMult,
    source: "automated",
    citation: DEFAULTS.businessImpact.companySizeMultipliersCitation,
  });

  // Resolve industry multiplier
  const industryKey = (inputs.industry || "technology").toLowerCase();
  const industryMultipliers =
    config.businessImpact?.industryMultipliers ?? DEFAULTS.businessImpact.industryMultipliers;
  const industryMult = industryMultipliers[industryKey] ?? 1.0;

  steps.push({
    label: "Industry multiplier",
    value: industryMult,
    source: "automated",
    citation: DEFAULTS.businessImpact.industryMultipliersCitation,
  });

  // Resolve gap escalation rate
  const gapEscalationRate =
    config.businessImpact?.gapEscalationRate ?? DEFAULTS.businessImpact.gapEscalationRate;
  const gapEscalationIsDefault = config.businessImpact?.gapEscalationRate === undefined;

  steps.push({
    label: "Gap escalation rate",
    value: `${(gapEscalationRate * 100).toFixed(0)}% per unmitigated control`,
    source: gapEscalationIsDefault ? "default" : "configured",
    citation: gapEscalationIsDefault
      ? DEFAULTS.businessImpact.gapEscalationRateCitation
      : undefined,
    recommendation: gapEscalationIsDefault
      ? DEFAULTS.businessImpact.gapEscalationRateRecommendation
      : undefined,
  });

  steps.push({
    label: "Controls with no evidence (gaps)",
    value: inputs.noEvidenceControls,
    source: "automated",
  });

  const gapSeverityMultiplier = 1 + inputs.noEvidenceControls * gapEscalationRate;

  steps.push({
    label: "Gap severity multiplier",
    value: `1 + ${inputs.noEvidenceControls} × ${gapEscalationRate} = ${gapSeverityMultiplier.toFixed(4)}`,
    source: "computed",
  });

  const estimate = Math.round(baseline * sizeMult * industryMult * gapSeverityMultiplier);

  steps.push({
    label: "Estimated breach cost",
    value: `AUD $${(baseline / 1_000_000).toFixed(2)}M × ${sizeMult} × ${industryMult} × ${gapSeverityMultiplier.toFixed(4)} = AUD $${(estimate / 1_000_000).toFixed(2)}M`,
    source: "computed",
  });

  if (!inputs.companySize) {
    warnings.push(`Company size not set — defaulting to "${sizeKey}". Set in Org Settings.`);
  }
  if (!inputs.industry) {
    warnings.push(`Industry not set — defaulting to "${industryKey}". Set in Org Settings.`);
  }

  return {
    value: {
      estimate,
      baseline,
      sizeMultiplier: sizeMult,
      industryMultiplier: industryMult,
      gapMultiplier: gapSeverityMultiplier,
      sizeKey,
      industryKey,
    },
    methodology: "IBM Cost of a Data Breach 2024 (Australian cohort) with org-specific multipliers",
    formula: `baseline × sizeMultiplier × industryMultiplier × (1 + gaps × gapEscalationRate)`,
    steps,
    inputs: { ...inputs, sizeKey, industryKey, baseline, gapEscalationRate },
    warnings,
    isDefault: baselineIsDefault && gapEscalationIsDefault,
  };
}
