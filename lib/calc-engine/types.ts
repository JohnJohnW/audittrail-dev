/**
 * Transparent Calculation Engine — Core Types
 *
 * Every calculated value in Audit Trail is wrapped in CalcResult<T>
 * to provide full transparency into inputs, weights, and methodology.
 */

export interface CalcStep {
  label: string;
  value: string | number | boolean;
  source: "automated" | "configured" | "default" | "computed" | "external";
  recommendation?: string;
  citation?: string;
}

export interface CalcResult<T> {
  value: T;
  methodology: string;
  formula?: string;
  steps: CalcStep[];
  inputs: Record<string, unknown>;
  warnings: string[];
  isDefault: boolean;
  sensitivity?: {
    variable: string;
    currentValue: unknown;
    impact: string;
  }[];
  /**
   * NIST SP 800-53A effectiveness aggregate, present when per-control
   * effectiveness data is available in the assessed controls.
   */
  effectiveness?: Record<string, unknown>;
}
