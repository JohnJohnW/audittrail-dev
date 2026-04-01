/**
 * Transparent Compliance Score Calculator
 *
 * Evidence coverage scoring (existing): weighted count of controls with evidence.
 * Methodology: NIST SP 800-53A Rev 5 §2.5: determination of whether assessment
 * objectives are satisfied, partially satisfied, or not satisfied.
 *
 * Evidence tier → SP 800-53A determination language:
 *   has_evidence  → "Satisfied: control objective met (examine + test)"
 *   partial       → "Partially Satisfied: some assessment objectives met"
 *   limited       → "Other Than Satisfied: supplementary assessment required"
 *   no_evidence   → "Not Determined: no assessment evidence available"
 *
 * Continuous monitoring approach per NIST SP 800-137 Rev 1:
 * Evidence is collected in real time via GitHub App webhooks + daily background sync,
 * matching SP 800-137's "ongoing monitoring" model (not point-in-time assessments).
 *
 * Control effectiveness scoring (per control, when effectiveness data is present):
 *   controlScore = designScore × 0.3 + operatingScore × 0.5 + qualityScore × 0.2
 * Weights reflect SP 800-53A emphasis: operating effectiveness is the primary indicator
 * of whether a control is functioning as intended (design alone is insufficient).
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

  // ── Effectiveness summary (where per-control data is available) ────────────
  // Aggregates the NIST SP 800-53A three-dimension scores across all controls
  // that have effectiveness data (pr_approvals, branch_protection, commit_history,
  // and dependency-patching controls). Controls without effectiveness data (e.g.
  // membership events, CI artifacts) are excluded from this aggregate.
  const controlsWithEffectiveness = controls.filter((c) => c.effectiveness !== undefined);
  let effectivenessSummary:
    | {
        avgDesign: number;
        avgOperating: number;
        avgQuality: number;
        avgOverall: number;
        controlCount: number;
        effectiveCount: number;
        partiallyEffectiveCount: number;
        minimallyEffectiveCount: number;
        notEffectiveCount: number;
        nistMethodology: string;
      }
    | undefined;

  if (controlsWithEffectiveness.length > 0) {
    const eff = controlsWithEffectiveness.map((c) => c.effectiveness!);
    const avg = (fn: (e: (typeof eff)[0]) => number) =>
      Math.round(eff.reduce((sum, e) => sum + fn(e), 0) / eff.length);

    effectivenessSummary = {
      avgDesign: avg((e) => e.designScore),
      avgOperating: avg((e) => e.operatingScore),
      avgQuality: avg((e) => e.qualityScore),
      avgOverall: avg((e) => e.overallScore),
      controlCount: controlsWithEffectiveness.length,
      effectiveCount: eff.filter((e) => e.overallEffectiveness === "effective").length,
      partiallyEffectiveCount: eff.filter((e) => e.overallEffectiveness === "partially_effective")
        .length,
      minimallyEffectiveCount: eff.filter((e) => e.overallEffectiveness === "minimally_effective")
        .length,
      notEffectiveCount: eff.filter((e) => e.overallEffectiveness === "not_effective").length,
      nistMethodology:
        "SP 800-53A Rev 5 §2.5: design×0.3 + operating×0.5 + quality×0.2. Operating effectiveness is the primary indicator of control health",
    };

    steps.push({
      label: "Effectiveness assessment (NIST SP 800-53A)",
      value: `${effectivenessSummary.effectiveCount} effective, ${effectivenessSummary.partiallyEffectiveCount} partially effective, ${effectivenessSummary.notEffectiveCount} not effective (${controlsWithEffectiveness.length} controls assessed)`,
      source: "computed",
    });
  }

  return {
    value: { ...summary, score },
    methodology:
      "NIST SP 800-53A Rev 5: evidence coverage weighted by satisfaction level: satisfied (1.0), partially satisfied (partialWeight), other-than-satisfied / not-determined (0). Continuous monitoring per NIST SP 800-137.",
    formula: `(withEvidence + (partial + limited) × ${partialWeight}) / total × 100`,
    steps,
    inputs: { controls: controls.length, partialWeight },
    warnings,
    isDefault: partialIsDefault,
    ...(effectivenessSummary ? { effectiveness: effectivenessSummary } : {}),
  };
}
