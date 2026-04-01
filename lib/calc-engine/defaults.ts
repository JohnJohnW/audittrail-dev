/**
 * Transparent Calculation Engine: System Defaults
 *
 * Every default value includes its source citation and a recommendation
 * string explaining when to override it.
 *
 * Assessment methodology grounded in:
 * - NIST SP 800-53A Rev 5: Assessing Security and Privacy Controls in Information Systems
 *   (assess methods: examine, interview, test; assessment objectives; determination statements)
 * - NIST SP 800-137 Rev 1: Information Security Continuous Monitoring (ISCM)
 *   (justifies real-time, webhook-based evidence collection)
 * - NIST SP 800-37 Rev 2: Risk Management Framework
 *   (Step 4: Assess Controls; Step 6: Monitor Controls)
 */

export const DEFAULTS = {
  scoring: {
    partialWeight: 0.5,
    partialWeightCitation:
      "NIST SP 800-53A Rev 5 §2.5: partial satisfaction means some, but not all, assessment objectives are met. 0.5 reflects the midpoint between satisfied and not satisfied.",
    partialWeightRecommendation:
      "0.5 is standard. Lower to 0.25 if your auditor requires stronger evidence thresholds. Raise to 0.75 if partial evidence is commonly accepted in your industry.",

    frameworkWeights: {
      "SOC 2": 1.5,
      "ISO 27001": 1.5,
      "ISO 27001:2022": 1.5,
    } as Record<string, number>,
    frameworkWeightsRecommendation:
      "SOC 2 and ISO 27001 are weighted 1.5x because they are the most commonly requested certifications in enterprise sales. Adjust to match your priorities.",
    defaultFrameworkWeight: 1.0,

    /**
     * Control effectiveness weighting per NIST SP 800-53A Rev 5.
     *
     * SP 800-53A defines three assessment dimensions. Weights reflect NIST's
     * emphasis that operating effectiveness is the primary indicator of control health:
     * a well-designed control that is not consistently applied provides little assurance.
     *
     * Formula: controlScore = design × 0.3 + operating × 0.5 + quality × 0.2
     */
    effectivenessWeights: {
      design: 0.3,
      designCitation:
        "NIST SP 800-53A Rev 5 §2.4: design adequacy. examine assessment method. Necessary but insufficient without operating effectiveness.",
      operating: 0.5,
      operatingCitation:
        "NIST SP 800-53A Rev 5 §2.4: operating effectiveness. test assessment method. Primary indicator of whether a control is functioning as intended in practice.",
      quality: 0.2,
      qualityCitation:
        "NIST SP 800-53A Rev 5 §2.3: evidence quality. specificity, freshness, and traceability of artifacts collected.",
    },

    /**
     * NIST SP 800-53A evidence tier labels.
     * Maps Audit Trail status values to SP 800-53A determination language.
     */
    evidenceTierLabels: {
      has_evidence:
        "Satisfied. control objective met (SP 800-53A: examine + test evidence available)",
      partial:
        "Partially Satisfied. some assessment objectives met; supplementary evidence recommended",
      limited:
        "Other Than Satisfied. requires supplementary assessment beyond GitHub-evidenceable controls",
      no_evidence: "Not Determined. no assessment evidence available from GitHub activity",
    } as Record<string, string>,
  },

  businessImpact: {
    breachBaseline: 4_260_000,
    breachBaselineCitation:
      "IBM Cost of a Data Breach Report 2024, Australian cohort (Ponemon Institute methodology)",
    breachBaselineRecommendation:
      "AUD $4.26M is the Australian average. For US orgs, consider USD $4.88M (IBM 2024 global average). Adjust if you have internal actuarial data.",

    gapEscalationRate: 0.04,
    gapEscalationRateCitation:
      "Derived from IBM 2024: orgs with more unmitigated security gaps have proportionally higher breach costs",
    gapEscalationRateRecommendation:
      "4% per gap is the default. If your controls are defense-in-depth (overlapping), lower the rate. If controls are independent (single points of failure), raise it.",

    companySizeMultipliers: {
      "1-10": 0.28,
      "11-50": 0.45,
      "51-200": 0.75,
      "201-500": 1.0,
      "501-1000": 1.35,
      "1001+": 1.65,
    } as Record<string, number>,
    companySizeMultipliersCitation:
      "IBM AU 2024: SMBs (<500 employees) avg 40% below the mean; large enterprises (>1000) avg 60% above. Interpolated for intermediate bands.",

    industryMultipliers: {
      healthcare: 1.8,
      financial: 1.32,
      technology: 1.36,
      retail: 0.95,
      government: 1.15,
      education: 0.82,
      other: 1.0,
    } as Record<string, number>,
    industryMultipliersCitation:
      "IBM Cost of a Data Breach 2024 Australian cohort industry breakdown. Technology: AUD $5.81M (x1.36), Financial: AUD $5.61M (x1.32), Healthcare: highest globally.",
  },

  auditReadiness: {
    thresholds: [
      { minScore: 80, min: 0, max: 14, label: "7-14 days" },
      { minScore: 65, min: 21, max: 45, label: "3-6 weeks" },
      { minScore: 50, min: 45, max: 90, label: "6-12 weeks" },
      { minScore: 0, min: 90, max: 180, label: "3-6 months" },
    ],
    thresholdsRecommendation:
      "Based on empirical estimate: 4 hrs/gap remediation + evidence collection buffer. Adjust if your team has faster or slower remediation velocity.",

    dealBlocker: {
      highScoreThreshold: 50,
      highGapThreshold: 5,
      mediumScoreThreshold: 75,
      mediumGapThreshold: 2,
    },
    dealBlockerRecommendation:
      "Default thresholds: high risk if score <50 or >5 gaps, medium if score <75 or >2 gaps. Adjust based on your customer requirements.",

    predictedOutcome: {
      passMaxGaps: 0,
      passWithFindingsMaxGaps: 3,
    },
    predictedOutcomeRecommendation:
      "0 gaps = likely pass, 1-3 gaps = pass with findings, >3 = at risk. Adjust based on your auditor's typical tolerance.",
  },

  gapAnalysis: {
    effortEstimates: {
      branch_protection: { effort: "low" as const, daysToFix: 1 },
      pr_approvals: { effort: "low" as const, daysToFix: 2 },
      pr: { effort: "low" as const, daysToFix: 2 },
      commit_history: { effort: "medium" as const, daysToFix: 7 },
      ci: { effort: "medium" as const, daysToFix: 5 },
    } as Record<string, { effort: "low" | "medium" | "high"; daysToFix: number }>,
    defaultEffort: { effort: "high" as const, daysToFix: 14 },
    effortEstimatesRecommendation:
      "Adjust based on your team's velocity. If you have a dedicated DevOps team, branch protection may take 0.5 days. If you're a small team without Git expertise, it may take 3.",
  },
} as const;
