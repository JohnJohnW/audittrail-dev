# Transparent Calculations & Adjustable Determinations, Design Spec

**Date:** 2026-04-01
**Status:** Design specification (pre-implementation)
**Scope:** Every calculated value in Audit Trail that produces a compliance score, metric, dollar amount, risk rating, or coverage percentage.

---

## Problem Statement

Audit Trail currently computes compliance scores, breach cost estimates, readiness ratings, and gap priorities using hardcoded formulas, weights, and thresholds. Users see the output but cannot:

1. See how a number was derived (formula, inputs, weights)
2. Adjust assumptions to match their context (org size, industry, auditor requirements)
3. Understand which variables are driving a result
4. Know when a default assumption may not apply to their situation

This opacity undermines trust -- the same "black box" problem that commoditized compliance platforms face.

---

## Current Calculation Inventory

| Calculation                    | Location                                       | Hardcoded Values                                                                            |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Compliance score**           | `lib/compliance.ts:getEvidenceSummary()`       | Partial weight = 0.5, thresholds for has_evidence/partial/limited                           |
| **Framework scores**           | `lib/compliance.ts:calculateFrameworkScores()` | Same formula per framework group                                                            |
| **Readiness score**            | `app/api/dashboards/ciso/route.ts`             | SOC 2 / ISO 27001 weight = 1.5x, others = 1.0x                                              |
| **Breach cost estimate**       | `app/api/dashboards/ciso/route.ts`             | AUD $4.26M baseline, 6 size multipliers, 7 industry multipliers, +4% per gap                |
| **Regulatory fine exposure**   | `app/api/dashboards/ciso/route.ts`             | PCI = $165K\*12, Privacy Act = $50M                                                         |
| **Deal-blocker risk**          | `app/api/dashboards/ciso/route.ts`             | High: score<50 or gaps>5, Medium: score<75 or gaps>2                                        |
| **Days to audit-ready**        | `app/api/dashboards/ciso/route.ts`             | 4 tiers based on readiness score (80/65/50)                                                 |
| **Predicted audit outcome**    | `app/api/dashboards/ciso/route.ts`             | 0 gaps = likely_pass, <=3 = pass_with_findings, >3 = at_risk                                |
| **Gap priority / effort**      | `lib/gap-analysis.ts`                          | Effort per evidence type (branch_protection: 1d, pr: 2d, commits: 7d, ci: 5d, default: 14d) |
| **Branch protection strength** | `lib/compliance.ts`                            | 7-point scale, each rule = 1 point                                                          |
| **Evidence relevance**         | `lib/compliance.ts:getCommitRelevance()`       | 30+ regex patterns mapped to high/medium/low per control code                               |

**Note:** The CISO dashboard already includes partial "show your work" data (`breachCostBasis`, `dealBlockerBasis`, `daysToAuditReadyBasis`). This spec formalizes and generalizes that pattern.

---

## Architecture: Three-Layer Design

### Layer 1: Configuration Model (Database)

#### Schema Addition

```prisma
model OrgCalcConfig {
  id        String       @id @default(cuid())
  orgId     String       @unique
  config    Json         @default("{}")
  updatedAt DateTime     @updatedAt
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}
```

#### Config Schema (Zod-validated at runtime)

```typescript
const OrgCalcConfigSchema = z
  .object({
    scoring: z
      .object({
        partialWeight: z.number().min(0).max(1).optional(),
        // Default: 0.5. Controls how partial/limited evidence contributes to the score.
        // Recommendation: 0.5 is standard. Lower to 0.25 if your auditor requires
        // stronger evidence thresholds. Raise to 0.75 if partial evidence is commonly
        // accepted in your industry.

        frameworkWeights: z.record(z.string(), z.number().min(0).max(5)).optional(),
        // Default: { "SOC 2": 1.5, "ISO 27001:2022": 1.5, others: 1.0 }
        // Controls the weighted average for the readiness score.
        // Recommendation: Weight frameworks that your customers or regulators
        // prioritize. If you only pursue one certification, set it to 2.0 and others to 0.5.

        evidenceThresholds: z
          .object({
            highRelevanceForFull: z.number().optional(), // Default: 1
            totalEvidenceForFull: z.number().optional(), // Default: 10
            minEvidenceForPartial: z.number().optional(), // Default: 1
          })
          .optional(),
      })
      .optional(),

    businessImpact: z
      .object({
        breachBaseline: z.number().positive().optional(),
        // Default: 4260000 (AUD). Source: IBM Cost of a Data Breach 2024, Australian cohort.
        // Recommendation: Use 4260000 for Australian organisations. For US orgs, consider
        // USD $4.88M (IBM 2024 global average). Adjust if you have internal actuarial data.

        gapEscalationRate: z.number().min(0).max(0.5).optional(),
        // Default: 0.04 (4% per unmitigated control).
        // Recommendation: 4% is derived from IBM's finding that orgs with more security
        // gaps have proportionally higher breach costs. Adjust based on your risk appetite.

        companySizeMultipliers: z.record(z.string(), z.number().positive()).optional(),
        // Default: {"1-10": 0.28, "11-50": 0.45, "51-200": 0.75, "201-500": 1.0, "501-1000": 1.35, "1001+": 1.65}
        // Source: IBM AU 2024. SMBs (<500) average 40% below mean; large enterprises (>1000) 60% above.

        industryMultipliers: z.record(z.string(), z.number().positive()).optional(),
        // Default: {healthcare: 1.8, financial: 1.32, technology: 1.36, retail: 0.95, government: 1.15, education: 0.82, other: 1.0}
        // Source: IBM Cost of a Data Breach 2024 Australian cohort industry breakdown.
      })
      .optional(),

    auditReadiness: z
      .object({
        thresholds: z
          .object({
            readyDays: z
              .object({ minScore: z.number(), min: z.number(), max: z.number(), label: z.string() })
              .array()
              .optional(),
            // Default: [{minScore: 80, min: 0, max: 14, label: "7-14 days"}, {minScore: 65, min: 21, max: 45, label: "3-6 weeks"}, ...]
          })
          .optional(),
        dealBlocker: z
          .object({
            highScoreThreshold: z.number().optional(), // Default: 50
            highGapThreshold: z.number().optional(), // Default: 5
            mediumScoreThreshold: z.number().optional(), // Default: 75
            mediumGapThreshold: z.number().optional(), // Default: 2
          })
          .optional(),
        predictedOutcome: z
          .object({
            passMaxGaps: z.number().optional(), // Default: 0
            passWithFindingsMaxGaps: z.number().optional(), // Default: 3
          })
          .optional(),
      })
      .optional(),

    gapAnalysis: z
      .object({
        effortEstimates: z
          .record(
            z.string(),
            z.object({
              effort: z.enum(["low", "medium", "high"]),
              daysToFix: z.number().positive(),
            })
          )
          .optional(),
        // Default: {branch_protection: {effort: "low", daysToFix: 1}, pr_approvals: {effort: "low", daysToFix: 2}, ...}
        // Recommendation: Adjust based on your team's velocity. If you have a dedicated
        // DevOps team, branch protection may take 0.5 days. If you're a small team, it may take 3.
      })
      .optional(),
  })
  .partial();
```

#### Design Rationale

- **JSON column** rather than normalized columns because the number of configurable parameters will grow. Each addition should not require a migration.
- **Zod validation at runtime** ensures type safety without rigid schema.
- **Optional everything** -- unconfigured values fall through to system defaults.
- **Extends existing pattern** -- `OrgProfile` already stores per-org context (industry, companySize, techStack).

---

### Layer 2: Transparent Calculation Engine

#### Directory Structure

```
lib/calc-engine/
  types.ts              # CalcResult<T>, CalcStep, CalcInput types
  defaults.ts           # All system defaults with recommendation strings and source citations
  config.ts             # Load + validate OrgCalcConfig, merge with defaults
  compliance-score.ts   # Transparent compliance score calculator
  readiness-score.ts    # Transparent readiness score (weighted framework average)
  breach-cost.ts        # Transparent breach cost estimator
  regulatory-fines.ts   # Transparent regulatory fine calculator
  deal-blocker.ts       # Transparent deal-blocker risk assessment
  audit-readiness.ts    # Transparent days-to-audit-ready estimator
  gap-priority.ts       # Transparent gap effort and impact calculator
  branch-protection.ts  # Transparent branch protection strength scorer
  index.ts              # Re-exports
```

#### Core Types

```typescript
// lib/calc-engine/types.ts

export interface CalcStep {
  label: string;
  value: string | number | boolean;
  source: "automated" | "configured" | "default" | "computed" | "external";
  recommendation?: string; // Shown when source is "default"
  citation?: string; // Data source citation
}

export interface CalcResult<T> {
  value: T;
  methodology: string; // One-line description of the approach
  formula?: string; // The formula used (e.g., "(withEvidence + partial*0.5) / total * 100")
  steps: CalcStep[]; // Ordered list of inputs and intermediate values
  inputs: Record<string, unknown>; // Raw inputs for reproducibility
  warnings: string[]; // Flagged issues (e.g., "Industry not configured -- using 'technology' default")
  isDefault: boolean; // True if all parameters used defaults (no org customisation)
  sensitivity?: {
    // Which inputs most affect the output
    variable: string;
    currentValue: unknown;
    impact: string; // e.g., "Changing from 0.5 to 0.25 would lower score by ~8 points"
  }[];
}
```

#### Calculator Pattern (Example: Breach Cost)

```typescript
// lib/calc-engine/breach-cost.ts

import { DEFAULTS } from "./defaults";
import { loadOrgConfig } from "./config";
import type { CalcResult, CalcStep } from "./types";

export async function calculateBreachCost(
  orgId: string,
  noEvidenceControls: number,
  orgProfile: { industry?: string; companySize?: string } | null
): Promise<CalcResult<number>> {
  const config = await loadOrgConfig(orgId);
  const steps: CalcStep[] = [];
  const warnings: string[] = [];
  let isDefault = true;

  // Step 1: Baseline
  const baseline = config.businessImpact?.breachBaseline ?? DEFAULTS.businessImpact.breachBaseline;
  const baselineIsDefault = !config.businessImpact?.breachBaseline;
  steps.push({
    label: "Breach cost baseline",
    value: baseline,
    source: baselineIsDefault ? "default" : "configured",
    recommendation: baselineIsDefault
      ? "AUD $4.26M is the Australian average (IBM 2024). Adjust for your region or use internal actuarial data."
      : undefined,
    citation: "IBM Cost of a Data Breach Report 2024, Australian cohort (Ponemon methodology)",
  });
  if (!baselineIsDefault) isDefault = false;

  // Step 2: Company size multiplier
  const sizeKey = orgProfile?.companySize || "51-200";
  const sizeMultipliers =
    config.businessImpact?.companySizeMultipliers ?? DEFAULTS.businessImpact.companySizeMultipliers;
  const sizeMult = sizeMultipliers[sizeKey] ?? 1.0;
  if (!orgProfile?.companySize) {
    warnings.push(
      "Company size not configured -- using '51-200' default (multiplier: 0.75). Set your company size in Settings > Organisation Profile for an accurate estimate."
    );
  }
  steps.push({
    label: `Company size multiplier (${sizeKey})`,
    value: sizeMult,
    source: orgProfile?.companySize ? "automated" : "default",
    citation:
      "IBM AU 2024: SMBs (<500) avg 40% below mean; large enterprises (>1000) avg 60% above",
  });

  // Step 3: Industry multiplier
  const industryKey = (orgProfile?.industry || "technology").toLowerCase();
  const industryMultipliers =
    config.businessImpact?.industryMultipliers ?? DEFAULTS.businessImpact.industryMultipliers;
  const industryMult = industryMultipliers[industryKey] ?? 1.0;
  if (!orgProfile?.industry) {
    warnings.push(
      "Industry not configured -- using 'technology' default (multiplier: 1.36). Set your industry in Settings > Organisation Profile."
    );
  }
  steps.push({
    label: `Industry multiplier (${industryKey})`,
    value: industryMult,
    source: orgProfile?.industry ? "automated" : "default",
    citation: "IBM Cost of a Data Breach 2024 Australian cohort industry breakdown",
  });

  // Step 4: Gap severity
  const gapRate =
    config.businessImpact?.gapEscalationRate ?? DEFAULTS.businessImpact.gapEscalationRate;
  const gapMultiplier = 1 + noEvidenceControls * gapRate;
  steps.push({
    label: "Unmitigated control gaps",
    value: noEvidenceControls,
    source: "automated",
  });
  steps.push({
    label: `Gap escalation rate`,
    value: `+${(gapRate * 100).toFixed(0)}% per gap`,
    source: config.businessImpact?.gapEscalationRate ? "configured" : "default",
    recommendation: !config.businessImpact?.gapEscalationRate
      ? "4% per gap is derived from IBM's correlation between security gaps and breach cost. Adjust based on your risk appetite."
      : undefined,
  });
  steps.push({
    label: "Gap severity multiplier",
    value: gapMultiplier,
    source: "computed",
  });

  // Step 5: Final calculation
  const result = Math.round(baseline * sizeMult * industryMult * gapMultiplier);
  steps.push({
    label: "Formula",
    value: `${baseline.toLocaleString()} x ${sizeMult} x ${industryMult} x ${gapMultiplier.toFixed(2)} = ${result.toLocaleString()}`,
    source: "computed",
  });

  return {
    value: result,
    methodology:
      "Estimated total breach cost based on IBM 2024 Australian cohort data, adjusted for company size, industry, and unmitigated compliance gaps.",
    formula: "baseline x sizeMultiplier x industryMultiplier x (1 + gaps x gapRate)",
    steps,
    inputs: { baseline, sizeMult, industryMult, noEvidenceControls, gapRate },
    warnings,
    isDefault,
    sensitivity: [
      {
        variable: "companySize",
        currentValue: sizeKey,
        impact: `Changing to "1001+" would increase estimate by ${Math.round((1.65 / sizeMult - 1) * 100)}%`,
      },
      {
        variable: "gapEscalationRate",
        currentValue: gapRate,
        impact: `Reducing to 2% would lower estimate by AUD $${Math.round(baseline * sizeMult * industryMult * noEvidenceControls * 0.02).toLocaleString()}`,
      },
    ],
  };
}
```

#### Integration Pattern

Existing functions in `lib/compliance.ts` are NOT modified. The calc engine wraps them:

```typescript
// lib/calc-engine/compliance-score.ts

import { getEvidenceSummary, type EvidenceSummary } from "@/lib/compliance";
import { loadOrgConfig } from "./config";
import { DEFAULTS } from "./defaults";
import type { CalcResult } from "./types";

export async function calculateComplianceScore(
  orgId: string,
  controls: ControlEvidence[]
): Promise<CalcResult<EvidenceSummary>> {
  const config = await loadOrgConfig(orgId);
  const partialWeight = config.scoring?.partialWeight ?? DEFAULTS.scoring.partialWeight;

  // Use existing function for the actual calculation
  const summary = getEvidenceSummary(controls);

  // Wrap with transparency
  return {
    value: summary,
    methodology: "Weighted evidence coverage across all active controls",
    formula: `(withEvidence + (partial + limited) x ${partialWeight}) / total x 100`,
    steps: [
      { label: "Controls with full evidence", value: summary.withEvidence, source: "automated" },
      { label: "Controls with partial evidence", value: summary.partial, source: "automated" },
      { label: "Controls with limited evidence", value: summary.limited, source: "automated" },
      { label: "Controls with no evidence", value: summary.noEvidence, source: "automated" },
      { label: "Total controls", value: summary.total, source: "automated" },
      {
        label: "Partial/limited weight",
        value: partialWeight,
        source: config.scoring?.partialWeight ? "configured" : "default",
        recommendation: !config.scoring?.partialWeight
          ? "0.5 is standard. Lower to 0.25 if your auditor requires stronger evidence thresholds."
          : undefined,
      },
      {
        label: "Score",
        value: `(${summary.withEvidence} + ${summary.partial + summary.limited} x ${partialWeight}) / ${summary.total} x 100 = ${summary.score}`,
        source: "computed",
      },
    ],
    inputs: { controls: controls.length, partialWeight },
    warnings: [],
    isDefault: !config.scoring?.partialWeight,
  };
}
```

---

### Layer 3: API Response Format

#### Backward-Compatible `_calc` Namespace

API endpoints add a `_calc` key alongside existing response fields. Clients that don't read `_calc` see no change.

**Example: `/api/compliance/score` response**

```json
{
  "overall": 78,
  "overallSummary": { "total": 45, "withEvidence": 32, "partial": 8, "limited": 0, "noEvidence": 5 },
  "byFramework": [...],
  "byCategory": [...],
  "_calc": {
    "overall": {
      "value": 78,
      "methodology": "Weighted evidence coverage across all active controls",
      "formula": "(withEvidence + (partial + limited) x 0.5) / total x 100",
      "steps": [
        { "label": "Controls with full evidence", "value": 32, "source": "automated" },
        { "label": "Controls with partial evidence", "value": 8, "source": "automated" },
        { "label": "Controls with limited evidence", "value": 0, "source": "automated" },
        { "label": "Controls with no evidence", "value": 5, "source": "automated" },
        { "label": "Total controls", "value": 45, "source": "automated" },
        { "label": "Partial/limited weight", "value": 0.5, "source": "default", "recommendation": "0.5 is standard. Lower to 0.25 if your auditor requires stronger evidence." },
        { "label": "Score", "value": "(32 + 8 x 0.5) / 45 x 100 = 80", "source": "computed" }
      ],
      "warnings": [],
      "isDefault": true
    }
  }
}
```

**Example: `/api/dashboards/ciso` response (partial)**

```json
{
  "businessImpact": {
    "breachCostEstimate": 4350000,
    "_calc": {
      "breachCostEstimate": {
        "value": 4350000,
        "methodology": "IBM 2024 Australian cohort baseline, adjusted for org context",
        "formula": "baseline x sizeMultiplier x industryMultiplier x (1 + gaps x gapRate)",
        "steps": [...],
        "warnings": ["Industry not configured -- using 'technology' default"],
        "isDefault": false,
        "sensitivity": [...]
      }
    }
  }
}
```

---

### Layer 4: Frontend Components

#### `CalculationBreakdown` Component

An expandable panel that renders `CalcResult` data. Appears below any stat card or metric.

```
+----------------------------------------------------------+
|  Compliance Score: 78%                    [Show details]  |
+----------------------------------------------------------+
|  v Calculation Breakdown                                  |
|                                                           |
|  Methodology: Weighted evidence coverage across all       |
|  active controls                                          |
|                                                           |
|  Formula: (withEvidence + partial x 0.5) / total x 100   |
|                                                           |
|  Inputs:                                                  |
|    Controls with full evidence    32    [automated]       |
|    Controls with partial evidence  8    [automated]       |
|    Controls with no evidence       5    [automated]       |
|    Total controls                 45    [automated]       |
|    Partial weight                0.5    [default]         |
|      i "0.5 is standard. Lower to 0.25 if your auditor   |
|         requires stronger evidence thresholds."           |
|                                                           |
|  Result: (32 + 8 x 0.5) / 45 x 100 = 78                |
|                                                           |
|  [Adjust assumptions]                                     |
+----------------------------------------------------------+
```

#### `RecommendationBanner` Component

Amber banner shown when calculations use defaults that the user hasn't explicitly reviewed.

```
+----------------------------------------------------------+
|  ! Using default assumptions for breach cost estimate.    |
|    Industry: technology (multiplier: 1.36x)               |
|    Company size: 51-200 (multiplier: 0.75x)               |
|    [Configure in Settings]                                |
+----------------------------------------------------------+
```

#### `AdjustableInput` Component

Inline what-if controls that let users adjust assumptions and see the impact in real time.

```
+----------------------------------------------------------+
|  Partial evidence weight                                  |
|  [=====O===========] 0.5                                  |
|  0.0              0.5              1.0                     |
|                                                           |
|  Impact: Changing to 0.25 would lower your score from     |
|  78% to 73%                                               |
+----------------------------------------------------------+
```

---

### Layer 5: Settings Integration

New "Calculation Settings" section in `/settings` page, organized by domain:

#### Compliance Scoring

- Partial evidence weight (slider: 0.0 - 1.0, default 0.5)
- Framework weights (table: framework name, weight, default)

#### Business Impact

- Breach cost baseline (number input, AUD, default $4.26M)
- Gap escalation rate (slider: 0% - 50%, default 4%)
- Company size multipliers (editable table)
- Industry multipliers (editable table)

#### Audit Readiness

- Readiness tier thresholds (editable table)
- Deal-blocker thresholds (number inputs)
- Predicted outcome thresholds (number inputs)

#### Gap Analysis

- Effort estimates per evidence type (editable table: evidence type, effort level, days to fix)

Each setting shows:

- Current value (configured or default)
- System default with source citation
- Recommendation with reasoning
- "Reset to default" button

---

### Layer 6: Guided Recommendations

When a value uses a system default and the org hasn't explicitly configured it, the system surfaces a recommendation:

#### Recommendation Structure

```typescript
interface Recommendation {
  parameter: string;
  defaultValue: unknown;
  reasoning: string;
  source: string;
  whenToOverride: string;
}
```

#### Example Recommendations

| Parameter                | Default    | Reasoning                                                                                                            | When to Override                                                                                                                            |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial weight           | 0.5        | Industry standard: partial evidence is weighted at 50% in most compliance frameworks                                 | If your auditor requires full evidence for every control, lower to 0.25. If your industry commonly accepts partial evidence, raise to 0.75. |
| Breach baseline          | AUD $4.26M | IBM Cost of a Data Breach 2024, Australian cohort (Ponemon methodology)                                              | If you have internal actuarial data, your insurer's estimate, or are in a different region (US average: USD $4.88M).                        |
| Gap escalation rate      | 4%         | Derived from IBM's finding that each unmitigated security control correlates with proportionally higher breach costs | If your controls are defense-in-depth (overlapping), lower the rate. If controls are independent (single points of failure), raise it.      |
| SOC 2 weight             | 1.5x       | SOC 2 and ISO 27001 are the most commonly requested certifications in enterprise sales                               | If you're not pursuing SOC 2, set to 1.0. If SOC 2 is your only certification, set to 2.0.                                                  |
| Branch protection effort | 1 day      | Single-person task: configure GitHub branch rules                                                                    | If you have complex mono-repo setups or require change management, increase to 3-5 days.                                                    |

---

## API Endpoint for Configuration

### `GET /api/settings/calc-config`

Returns the org's current calculation configuration merged with system defaults.

### `PUT /api/settings/calc-config`

Updates the org's calculation configuration. Validates against Zod schema. Requires admin or owner role.

### `POST /api/settings/calc-config/preview`

Accepts a config override and returns recalculated values without saving. Used for the what-if "Adjust assumptions" UI.

---

## Migration Path

### Phase 1: Foundation (No behavior changes)

- Add `OrgCalcConfig` model to Prisma schema
- Create `lib/calc-engine/` with types, defaults, and config loader
- Create calculator modules that wrap existing functions
- **Deploy:** Invisible to users. Existing code untouched.

### Phase 2: API Transparency (Backward compatible)

- Add `_calc` namespace to `/api/compliance/score` response
- Add `_calc` namespace to `/api/dashboards/ciso` response
- Create `/api/settings/calc-config` endpoint
- **Deploy:** API consumers see new `_calc` data but nothing breaks.

### Phase 3: Read-Only Frontend

- Add `CalculationBreakdown` component to CISO dashboard
- Add `CalculationBreakdown` to compliance score display
- Add `RecommendationBanner` for unconfigured defaults
- **Deploy:** Users can see calculations but not adjust them.

### Phase 4: Adjustability

- Add "Calculation Settings" section to settings page
- Add `AdjustableInput` components for what-if scenarios
- Add `/api/settings/calc-config/preview` endpoint
- **Deploy:** Full adjustability live.

### Phase 5: Guided Recommendations

- Add recommendation strings to all defaults
- Add sensitivity analysis to `CalcResult`
- Surface warnings when org profile is incomplete
- **Deploy:** System actively guides users toward accurate configuration.

---

## Testing Strategy

1. **Unit tests** for each calculator module: verify output matches existing hardcoded formulas when no config overrides are provided
2. **Integration tests** for API responses: verify `_calc` namespace is present and structurally correct
3. **Snapshot tests** for frontend components: verify `CalculationBreakdown` renders correctly for sample `CalcResult` data
4. **Migration test:** Verify that orgs with no `OrgCalcConfig` row produce identical results to current behavior

---

## Files to Create or Modify

| File                                     | Action | Description                                        |
| ---------------------------------------- | ------ | -------------------------------------------------- |
| `prisma/schema.prisma`                   | Modify | Add `OrgCalcConfig` model                          |
| `lib/calc-engine/types.ts`               | Create | CalcResult, CalcStep, CalcInput types              |
| `lib/calc-engine/defaults.ts`            | Create | System defaults with recommendations and citations |
| `lib/calc-engine/config.ts`              | Create | Load + validate + merge org config                 |
| `lib/calc-engine/compliance-score.ts`    | Create | Transparent compliance score wrapper               |
| `lib/calc-engine/readiness-score.ts`     | Create | Transparent readiness score wrapper                |
| `lib/calc-engine/breach-cost.ts`         | Create | Transparent breach cost wrapper                    |
| `lib/calc-engine/regulatory-fines.ts`    | Create | Transparent regulatory fine wrapper                |
| `lib/calc-engine/deal-blocker.ts`        | Create | Transparent deal-blocker wrapper                   |
| `lib/calc-engine/audit-readiness.ts`     | Create | Transparent audit readiness wrapper                |
| `lib/calc-engine/gap-priority.ts`        | Create | Transparent gap priority wrapper                   |
| `lib/calc-engine/branch-protection.ts`   | Create | Transparent branch protection wrapper              |
| `lib/calc-engine/index.ts`               | Create | Re-exports                                         |
| `app/api/settings/calc-config/route.ts`  | Create | CRUD for org calc config                           |
| `app/api/compliance/score/route.ts`      | Modify | Add `_calc` to response                            |
| `app/api/dashboards/ciso/route.ts`       | Modify | Use calc engine, add `_calc`                       |
| `components/ui/CalculationBreakdown.tsx` | Create | Expandable calculation panel                       |
| `components/ui/TransparentStatCard.tsx`  | Create | Stat card with breakdown toggle                    |
| `components/ui/AdjustableInput.tsx`      | Create | What-if input controls                             |
| `components/ui/RecommendationBanner.tsx` | Create | Default-warning banner                             |
| `app/(dashboard)/settings/page.tsx`      | Modify | Add Calculation Settings section                   |
| `app/(dashboard)/ciso/page.tsx`          | Modify | Add CalculationBreakdown components                |
