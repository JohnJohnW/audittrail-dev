/**
 * Transparent Compliance Score Calculator
 *
 * Wraps getEvidenceSummary() with full calculation transparency.
 */

import type { ControlEvidence, EvidenceSummary } from "@/types/compliance";
import { getEvidenceSummary } from "@/lib/compliance";
import { loadOrgConfig, getPartialWeight } from "./config";
import { DEFAULTS } from "./defaults";
import type { CalcResult, CalcStep } from "./types";

export async function calculateTransparentComplianceScore(
  orgId: string,
  controls: ControlEvidence[]
): Promise<CalcResult<EvidenceSummary>> {
  const config = await loadOrgConfig(orgId);
  const { value: partialWeight, isDefault: partialIsDefault } = getPartialWeight(config);
  const steps: CalcStep[] = [];
  const warnings: string[] = [];

  const summary = getEvidenceSummary(controls);

  steps.push({
    label: "Controls with full evidence",
    value: summary.withEvidence,
    source: "automated",
  });
  steps.push({
    label: "Controls with partial evidence",
    value: summary.partial,
    source: "automated",
  });
  steps.push({
    label: "Controls with limited evidence",
    value: summary.limited,
    source: "automated",
  });
  steps.push({
    label: "Controls with no evidence",
    value: summary.noEvidence,
    source: "automated",
  });
  steps.push({
    label: "Total controls",
    value: summary.total,
    source: "automated",
  });
  steps.push({
    label: "Partial/limited weight",
    value: partialWeight,
    source: partialIsDefault ? "default" : "configured",
    recommendation: partialIsDefault ? DEFAULTS.scoring.partialWeightRecommendation : undefined,
  });

  const effectivePartial = summary.partial + summary.limited;
  const score =
    summary.total > 0
      ? Math.round(
          ((summary.withEvidence + effectivePartial * partialWeight) / summary.total) * 100
        )
      : 0;

  steps.push({
    label: "Score",
    value: `(${summary.withEvidence} + ${effectivePartial} x ${partialWeight}) / ${summary.total} x 100 = ${score}`,
    source: "computed",
  });

  return {
    value: { ...summary, score },
    methodology: "Weighted evidence coverage across all active controls",
    formula: `(withEvidence + (partial + limited) x ${partialWeight}) / total x 100`,
    steps,
    inputs: { controls: controls.length, partialWeight },
    warnings,
    isDefault: partialIsDefault,
  };
}
