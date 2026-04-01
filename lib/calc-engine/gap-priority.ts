/**
 * Transparent Gap Priority Calculator
 *
 * Assigns effort and time-to-fix estimates to controls with no evidence,
 * with full calculation transparency and configurable overrides.
 */

import { loadOrgConfig } from "./config";
import { DEFAULTS } from "./defaults";
import type { CalcResult, CalcStep } from "./types";

export interface GapControl {
  controlCode: string;
  controlName: string;
  frameworkName: string;
}

export interface PrioritisedGap {
  controlCode: string;
  controlName: string;
  frameworkName: string;
  effort: "low" | "medium" | "high";
  daysToFix: number;
  isDefaultEstimate: boolean;
}

export async function calculateTransparentGapPriority(
  orgId: string,
  gaps: GapControl[]
): Promise<CalcResult<PrioritisedGap[]>> {
  const config = await loadOrgConfig(orgId);
  const steps: CalcStep[] = [];
  const warnings: string[] = [];

  const effortEstimates =
    config.gapAnalysis?.effortEstimates ?? DEFAULTS.gapAnalysis.effortEstimates;
  const estimatesAreDefault = config.gapAnalysis?.effortEstimates === undefined;

  steps.push({
    label: "Effort estimate source",
    value: estimatesAreDefault ? "system defaults" : "org-configured",
    source: estimatesAreDefault ? "default" : "configured",
    recommendation: estimatesAreDefault
      ? DEFAULTS.gapAnalysis.effortEstimatesRecommendation
      : undefined,
  });

  const prioritised: PrioritisedGap[] = [];
  let defaultEstimateCount = 0;

  for (const gap of gaps) {
    const estimate = effortEstimates[gap.controlCode] ?? DEFAULTS.gapAnalysis.defaultEffort;
    const isDefaultEstimate = !(gap.controlCode in effortEstimates);
    if (isDefaultEstimate) defaultEstimateCount++;

    prioritised.push({
      controlCode: gap.controlCode,
      controlName: gap.controlName,
      frameworkName: gap.frameworkName,
      effort: estimate.effort,
      daysToFix: estimate.daysToFix,
      isDefaultEstimate,
    });

    steps.push({
      label: `Gap: ${gap.controlCode}`,
      value: `${estimate.effort} effort, ${estimate.daysToFix} day(s) to fix`,
      source: isDefaultEstimate ? "default" : "configured",
    });
  }

  // Sort: low effort first (quick wins), then medium, then high
  const effortOrder = { low: 0, medium: 1, high: 2 };
  prioritised.sort((a, b) => effortOrder[a.effort] - effortOrder[b.effort]);

  if (defaultEstimateCount > 0) {
    warnings.push(
      `${defaultEstimateCount} gap(s) used default effort estimates (14 days, high effort). ` +
        `Configure custom estimates via Settings → Calculation Engine.`
    );
  }

  return {
    value: prioritised,
    methodology: "Control-level effort estimates, sorted by remediation complexity (low → high)",
    steps,
    inputs: { gapCount: gaps.length },
    warnings,
    isDefault: estimatesAreDefault,
  };
}
