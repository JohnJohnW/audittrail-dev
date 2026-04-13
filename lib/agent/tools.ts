import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definitions for the Compliance Agent.
 * These tools give the agent access to Supabase/Prisma data during its reasoning.
 */
export const complianceAgentTools: Anthropic.Tool[] = [
  {
    name: "get_evidence_for_control",
    description:
      "Retrieve all evidence records from the database that are relevant to a specific compliance control. Returns structured evidence data including PR reviews, branch protection configs, Dependabot alerts, deployment records, and effectiveness scores.",
    input_schema: {
      type: "object" as const,
      properties: {
        control_code: {
          type: "string",
          description: 'The control code, e.g. "CC6.1" or "A.8.9" or "E8-PA"',
        },
        framework: {
          type: "string",
          description:
            'The compliance framework key: "soc2" | "iso27001" | "nist_csf" | "nist_800_53" | "essential_eight" | "pci_dss"',
        },
        lookback_days: {
          type: "number",
          description:
            "How many days of evidence to retrieve. Use 90 for Type 2 assessment, 30 for spot check.",
        },
      },
      required: ["control_code", "framework", "lookback_days"],
    },
  },
  {
    name: "get_branch_protections",
    description:
      "Get the current GitHub branch protection configuration for all tracked repositories. Returns protection rules including required reviewers, required status checks, admin enforcement, and CODEOWNERS requirements.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
      },
      required: ["org_id"],
    },
  },
  {
    name: "get_pr_review_quality_signals",
    description:
      "Analyse pull request reviews for quality indicators: total merged PRs, approval rate, average review-to-merge time, percentage of PRs with substantive comments (not just approvals), percentage of PRs where changes were requested, self-merge rate, and rubber-stamp review rate (approved within 60 seconds with no comments).",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
        lookback_days: {
          type: "number",
          description: "Days of PR data to analyse. Default 90.",
        },
      },
      required: ["org_id", "lookback_days"],
    },
  },
  {
    name: "get_repository_config",
    description:
      "Get the current GitHub repository configuration summary: repo count, active repos with names and default branches, branch protection status per repo, CI artifact summary, and deployment environment configs.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
      },
      required: ["org_id"],
    },
  },
  {
    name: "get_access_control_signals",
    description:
      "Retrieve signals related to access control: number of contributors with admin/write access, recent org membership changes (additions, removals, role changes), whether branch protection enforces admin restrictions, and any accounts with direct push to main without review.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
      },
      required: ["org_id"],
    },
  },
  {
    name: "get_dependabot_patch_lag",
    description:
      "Calculate vulnerability patching metrics: total alerts by severity, average time between Dependabot alert creation and patch merge for critical and high severity vulnerabilities, outstanding unpatched alerts count.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
        lookback_days: {
          type: "number",
          description: "Days of vulnerability data to analyse.",
        },
      },
      required: ["org_id", "lookback_days"],
    },
  },
  {
    name: "get_deployment_approval_rate",
    description:
      "Check what percentage of production deployments went through an approved PR with at least one reviewer who was not the author. Returns deployment count, approved percentage, and any deployments that bypassed review.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
        lookback_days: { type: "number" },
      },
      required: ["org_id", "lookback_days"],
    },
  },
  {
    name: "create_human_task",
    description:
      "Create a structured human task for a control that requires human action to complete. Use this for access reviews, vendor assessments, policy approvals, security training, DR tests, and board reviews. The task will appear in the user's task list with a due date and pre-populated template.",
    input_schema: {
      type: "object" as const,
      properties: {
        org_id: { type: "string" },
        control_code: { type: "string" },
        control_name: { type: "string" },
        framework: { type: "string" },
        task_type: {
          type: "string",
          description:
            'Type of human task: "access_review" | "vendor_assessment" | "training" | "policy_approval" | "board_review" | "dr_test"',
        },
        task_title: { type: "string" },
        task_description: {
          type: "string",
          description: "Clear plain-English description of exactly what the human needs to do",
        },
        pre_populated_template: {
          type: "object",
          description: "Agent-generated template to help the human complete the task faster",
        },
        days_until_due: {
          type: "number",
          description: "How many days the human has to complete this",
        },
      },
      required: [
        "org_id",
        "control_code",
        "control_name",
        "framework",
        "task_type",
        "task_title",
        "task_description",
        "days_until_due",
      ],
    },
  },
  {
    name: "save_control_assessment",
    description:
      "Save the completed assessment for a control to the database. Call this after you have finished investigating a control and written the audit narrative. This is the final step for each control.",
    input_schema: {
      type: "object" as const,
      properties: {
        agent_run_id: { type: "string" },
        org_id: { type: "string" },
        framework: { type: "string" },
        control_code: { type: "string" },
        control_name: { type: "string" },
        sufficiency_rating: {
          type: "string",
          enum: ["sufficient", "partial", "insufficient", "not_evidenced"],
        },
        confidence_score: {
          type: "number",
          description:
            "Your confidence in this assessment from 0.0 to 1.0. Be conservative, if evidence is sparse, score lower.",
        },
        evidence_records: {
          type: "array",
          items: { type: "string" },
          description: "Array of evidence identifiers used in this assessment",
        },
        audit_narrative: {
          type: "string",
          description:
            "200-400 word auditor-ready narrative. Professional tone. Cite specific evidence. Note any weaknesses honestly.",
        },
        agent_reasoning: {
          type: "string",
          description:
            "Your internal reasoning about this assessment, for debugging, not shown to auditors.",
        },
        remediation_plan: {
          type: "string",
          description:
            "If rating is partial or insufficient: specific steps to remediate. If sufficient: omit.",
        },
        remediation_type: {
          type: "string",
          enum: ["pr", "ticket", "manual", "none"],
        },
        remediation_artifact: {
          type: "object",
          description: "Draft PR body, ticket content, etc.",
        },
      },
      required: [
        "agent_run_id",
        "org_id",
        "framework",
        "control_code",
        "control_name",
        "sufficiency_rating",
        "confidence_score",
        "audit_narrative",
      ],
    },
  },
];

/** Get a subset of tools relevant to a specific control */
export function getToolsForControl(toolNames: string[]): Anthropic.Tool[] {
  // Always include save_control_assessment and create_human_task
  const required = new Set([...toolNames, "save_control_assessment", "create_human_task"]);
  return complianceAgentTools.filter((t) => required.has(t.name));
}
