/**
 * Compliance and Evidence Types
 */

// Evidence status levels
export type EvidenceStatus = "has_evidence" | "partial" | "no_evidence" | "limited";

// Evidence type categories
export type EvidenceType = "commit" | "pr" | "review" | "branch_protection";

// Relevance levels for evidence items
export type EvidenceRelevance = "high" | "medium" | "low";

// Zero Trust Architecture pillar classification
export type ZtaPillar = "identity" | "device" | "application" | "data" | "network" | "visibility";

// MITRE ATT&CK tactic coverage (derived from MDA Foundation mappings)
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
  /** Zero Trust Architecture pillar this control maps to */
  ztaPillar?: ZtaPillar;
  /** MITRE ATT&CK tactics this control helps mitigate */
  attackTactics?: AttackTactic[];
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
