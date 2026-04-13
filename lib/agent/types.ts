import type { ModelId } from "./anthropic";

// ============================================
// Control Definitions
// ============================================

export interface ControlDefinition {
  /** Control identifier, e.g. 'CC6.1' */
  code: string;
  /** Framework key, e.g. 'soc2' */
  framework: string;
  /** Human-readable framework name for display */
  frameworkName: string;
  /** Control title */
  name: string;
  /** What this control requires - given to the agent as context */
  description: string;
  /** Which agent tools are relevant for assessing this control */
  relevantTools: AgentToolName[];
  /** Whether this control inherently requires human action */
  requiresHumanAction: boolean;
  /** If requiresHumanAction, what type of task to create */
  humanTaskType?: HumanTaskType;
  /** Evidence sources the agent should look for */
  evidenceSources: string[];
}

// ============================================
// Agent Tool Names
// ============================================

export type AgentToolName =
  | "get_evidence_for_control"
  | "get_branch_protections"
  | "get_pr_review_quality_signals"
  | "get_repository_config"
  | "get_access_control_signals"
  | "get_dependabot_patch_lag"
  | "get_deployment_approval_rate"
  | "create_human_task"
  | "save_control_assessment";

// ============================================
// Agent Run Configuration
// ============================================

export interface AgentRunConfig {
  orgId: string;
  frameworks?: string[];
  controlCodes?: string[];
  triggeredBy: "scheduled" | "user" | "webhook";
  triggerEvent?: string;
  model?: ModelId;
}

// ============================================
// Assessment Result
// ============================================

export type SufficiencyRating = "sufficient" | "partial" | "insufficient" | "not_evidenced";

export interface AssessmentResult {
  controlCode: string;
  frameworkName: string;
  controlName: string;
  sufficiencyRating: SufficiencyRating;
  confidenceScore: number;
  auditNarrative: string;
  agentReasoning?: string;
  remediationPlan?: string;
  remediationType?: "pr" | "ticket" | "manual" | "none";
  remediationArtifact?: Record<string, unknown>;
  evidenceRecords?: Array<{ id: string; type: string; summary: string }>;
  tokensUsed: number;
  costCents: number;
}

// ============================================
// Human Task Types
// ============================================

export type HumanTaskType =
  | "access_review"
  | "vendor_assessment"
  | "training"
  | "policy_approval"
  | "board_review"
  | "dr_test";

// ============================================
// Tool Input/Output Types
// ============================================

export interface GetEvidenceInput {
  control_code: string;
  framework: string;
  lookback_days: number;
}

export interface GetBranchProtectionsInput {
  org_id: string;
}

export interface GetPRQualityInput {
  org_id: string;
  lookback_days: number;
}

export interface GetRepoConfigInput {
  org_id: string;
}

export interface GetAccessControlInput {
  org_id: string;
}

export interface GetDependabotPatchLagInput {
  org_id: string;
  lookback_days: number;
}

export interface GetDeploymentApprovalInput {
  org_id: string;
  lookback_days: number;
}

export interface CreateHumanTaskInput {
  org_id: string;
  control_code: string;
  control_name: string;
  framework: string;
  task_type: HumanTaskType;
  task_title: string;
  task_description: string;
  pre_populated_template?: Record<string, unknown>;
  days_until_due: number;
}

export interface SaveAssessmentInput {
  agent_run_id: string;
  org_id: string;
  framework: string;
  control_code: string;
  control_name: string;
  sufficiency_rating: SufficiencyRating;
  confidence_score: number;
  evidence_records?: string[];
  audit_narrative: string;
  agent_reasoning?: string;
  remediation_plan?: string;
  remediation_type?: "pr" | "ticket" | "manual" | "none";
  remediation_artifact?: Record<string, unknown>;
}
