/**
 * Compliance and Evidence Types
 *
 * Assessment methodology: NIST SP 800-53A Rev 5 (Assessing Security and Privacy Controls).
 * Continuous monitoring approach: NIST SP 800-137 Rev 1.
 * Control catalog: NIST SP 800-53 Rev 5.
 */

// Evidence status levels - mapped to NIST SP 800-53A determination language
export type EvidenceStatus = "has_evidence" | "partial" | "no_evidence" | "limited";

// Evidence type categories
export type EvidenceType = "commit" | "pr" | "review" | "branch_protection";

// Relevance levels for evidence items
export type EvidenceRelevance = "high" | "medium" | "low";

/**
 * NIST SP 800-53A assessment method for an evidence item.
 * - examine: Review artifacts (configs, docs, logs) - SP 800-53A §2.4.1
 * - test: Verify mechanism functions as intended - SP 800-53A §2.4.3
 * - examine_and_test: Both methods applied
 */
export type NistAssessmentMethod = "examine" | "test" | "examine_and_test";

/**
 * Control effectiveness determination per NIST SP 800-53A Rev 5.
 *
 * Evaluates three dimensions defined in SP 800-53A §2.5:
 * - Design adequacy: Is the control correctly designed? (examine method)
 * - Operating consistency: Is the control consistently applied? (test method)
 * - Evidence quality: How strong/trustworthy is the evidence?
 *
 * Weighted formula (SP 800-53A emphasis on operating effectiveness):
 *   overallScore = designScore × 0.3 + operatingScore × 0.5 + qualityScore × 0.2
 */
export interface ControlEffectiveness {
  /** Is the control configured correctly? 0–100 (SP 800-53A design assessment objective) */
  designScore: number;
  /** Is the control applied consistently over time? 0–100 (SP 800-53A operating effectiveness) */
  operatingScore: number;
  /** How strong is the evidence? 0–100 (traceability, specificity, freshness) */
  qualityScore: number;
  /** Weighted overall: design×0.3 + operating×0.5 + quality×0.2 */
  overallScore: number;
  /** SP 800-53A §2.5 effectiveness determination */
  overallEffectiveness:
    | "effective"
    | "partially_effective"
    | "minimally_effective"
    | "not_effective";
  /** SP 800-53A assessment method used to gather evidence */
  assessmentMethod: NistAssessmentMethod;
  /** Authoritative NIST SP 800-53 Rev 5 control reference */
  nistReference: string;
  /** Specific findings from the effectiveness assessment */
  findings: string[];
}

// MITRE ATT&CK tactic coverage
export type AttackTactic =
  | "initial-access"
  | "persistence"
  | "privilege-escalation"
  | "defense-evasion"
  | "credential-access"
  | "lateral-movement"
  | "exfiltration"
  | "impact";

/**
 * Individual piece of evidence linked to a control.
 * Used internally with Date objects.
 */
export interface EvidenceItem {
  type: EvidenceType;
  title: string;
  description: string;
  timestamp: Date;
  url?: string;
  metadata?: Record<string, unknown>;
  relevance?: EvidenceRelevance;
  repositoryId?: string;
  repositoryName?: string;
  repositoryFullName?: string;
}

/**
 * Serialized evidence item for API responses.
 * Uses ISO string for timestamp.
 */
export interface EvidenceItemSerialized {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  url?: string;
  relevance?: EvidenceRelevance;
  repositoryId?: string;
  repositoryName?: string;
  repositoryFullName?: string;
}

/**
 * Control with its associated evidence.
 */
export interface ControlEvidence {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  evidenceType: string;
  status: EvidenceStatus;
  evidenceCount: number;
  evidence: EvidenceItem[];
  note?: string;
  /** Embedding-based mapping confidence (0-1), undefined if embeddings unavailable */
  confidence?: number;
  /** Confidence tier: high (≥0.85), medium (0.60-0.84), low (<0.60), auditor_confirmed */
  confidenceTier?: "high" | "medium" | "low" | "auditor_confirmed";
  /** MITRE ATT&CK tactics this control helps mitigate */
  attackTactics?: AttackTactic[];
  /** Control effectiveness assessment per NIST SP 800-53A methodology */
  effectiveness?: ControlEffectiveness;
}

/**
 * Serialized control for API responses.
 */
export interface ComplianceControl {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  evidenceType: string;
  status: EvidenceStatus;
  evidenceCount: number;
  evidence: EvidenceItemSerialized[];
  note?: string;
  /** Embedding-based mapping confidence (0–1); undefined when vector store unavailable */
  mappingConfidence?: number;
  /** Derived confidence tier from embedding similarity score */
  confidenceTier?: "high" | "medium" | "low";
  /** Control effectiveness assessment per NIST SP 800-53A methodology */
  effectiveness?: ControlEffectiveness;
}

/**
 * Summary statistics for evidence coverage.
 */
export interface EvidenceSummary {
  total: number;
  withEvidence: number;
  partial: number;
  limited: number;
  noEvidence: number;
  score: number;
}

/**
 * Compliance framework definition.
 */
export interface Framework {
  id: string;
  name: string;
  description?: string;
  controlCount: number;
}

/**
 * Framework with its score.
 */
export interface FrameworkScore {
  name: string;
  score: number;
  total: number;
  withEvidence: number;
}

/**
 * Options for querying compliance evidence.
 */
export interface ComplianceEvidenceOptions {
  dateFrom?: Date;
  dateTo?: Date;
  repositoryIds?: string[];
}
