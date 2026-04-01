/**
 * Transparent Calculation Engine
 *
 * Re-exports all calc modules. Every calculated value is wrapped in
 * CalcResult<T> so consumers get full transparency: inputs, weights,
 * methodology, formula, step-by-step breakdown, and override recommendations.
 */

export type { CalcResult, CalcStep } from "./types";
export { DEFAULTS } from "./defaults";
export type { OrgCalcOverrides } from "./config";
export { loadOrgConfig, getPartialWeight, getFrameworkWeight } from "./config";
export { calculateTransparentComplianceScore } from "./compliance-score";
export { calculateTransparentBreachCost } from "./breach-cost";
export type { BreachCostInputs, BreachCostResult } from "./breach-cost";
export { calculateTransparentReadinessScore } from "./readiness-score";
export type { FrameworkScore, ReadinessScoreResult } from "./readiness-score";
export { calculateTransparentGapPriority } from "./gap-priority";
export type { GapControl, PrioritisedGap } from "./gap-priority";
