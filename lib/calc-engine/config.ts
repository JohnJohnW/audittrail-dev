/**
 * Transparent Calculation Engine: Configuration Loader
 *
 * Loads org-specific calculation config and merges with system defaults.
 */

import { db } from "@/lib/db";
import { DEFAULTS } from "./defaults";

export interface OrgCalcOverrides {
  scoring?: {
    partialWeight?: number;
    frameworkWeights?: Record<string, number>;
  };
  businessImpact?: {
    breachBaseline?: number;
    gapEscalationRate?: number;
    companySizeMultipliers?: Record<string, number>;
    industryMultipliers?: Record<string, number>;
  };
  auditReadiness?: {
    thresholds?: { minScore: number; min: number; max: number; label: string }[];
    dealBlocker?: {
      highScoreThreshold?: number;
      highGapThreshold?: number;
      mediumScoreThreshold?: number;
      mediumGapThreshold?: number;
    };
    predictedOutcome?: {
      passMaxGaps?: number;
      passWithFindingsMaxGaps?: number;
    };
  };
  gapAnalysis?: {
    effortEstimates?: Record<string, { effort: "low" | "medium" | "high"; daysToFix: number }>;
  };
}

/**
 * Load org-specific calc config. Returns empty object if none configured.
 */
export async function loadOrgConfig(orgId: string): Promise<OrgCalcOverrides> {
  try {
    const row = await db.orgCalcConfig.findUnique({
      where: { orgId },
      select: { config: true },
    });
    if (!row || !row.config) return {};
    return row.config as OrgCalcOverrides;
  } catch {
    // Table may not exist yet during migration
    return {};
  }
}

/** Get a scoring parameter, preferring org config over default. */
export function getPartialWeight(config: OrgCalcOverrides): {
  value: number;
  isDefault: boolean;
} {
  const value = config.scoring?.partialWeight ?? DEFAULTS.scoring.partialWeight;
  return { value, isDefault: config.scoring?.partialWeight === undefined };
}

/** Get framework weight, preferring org config over default. */
export function getFrameworkWeight(
  config: OrgCalcOverrides,
  frameworkName: string
): { value: number; isDefault: boolean } {
  const orgWeights = config.scoring?.frameworkWeights;
  if (orgWeights && frameworkName in orgWeights) {
    return { value: orgWeights[frameworkName], isDefault: false };
  }
  const defaultWeight =
    (DEFAULTS.scoring.frameworkWeights as Record<string, number>)[frameworkName] ??
    DEFAULTS.scoring.defaultFrameworkWeight;
  return { value: defaultWeight, isDefault: true };
}
