import { db } from "@/lib/db";
import { getComplianceEvidence } from "@/lib/compliance";
import type { GetEvidenceInput, CreateHumanTaskInput, SaveAssessmentInput } from "./types";

/**
 * Execute a tool call from the Compliance Agent.
 * Maps tool names to database queries and returns structured results.
 * The input comes directly from Claude's tool_use block, all fields are strings from the JSON schema.
 */
export async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  // The agent passes org_id in most tool calls, extract it for convenience
  const orgId = (input.org_id as string) ?? "";

  switch (toolName) {
    case "get_evidence_for_control":
      return executeGetEvidence(input as unknown as GetEvidenceInput, orgId);
    case "get_branch_protections":
      return executeGetBranchProtections(orgId);
    case "get_pr_review_quality_signals":
      return executeGetPRQuality(orgId, (input.lookback_days as number) ?? 90);
    case "get_repository_config":
      return executeGetRepoConfig(orgId);
    case "get_access_control_signals":
      return executeGetAccessControl(orgId);
    case "get_dependabot_patch_lag":
      return executeGetDependabotPatchLag(orgId, (input.lookback_days as number) ?? 90);
    case "get_deployment_approval_rate":
      return executeGetDeploymentApproval(orgId);
    case "create_human_task":
      return executeCreateHumanTask(input as unknown as CreateHumanTaskInput);
    case "save_control_assessment":
      return executeSaveAssessment(input as unknown as SaveAssessmentInput);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================
// Tool Implementations
// ============================================

async function executeGetEvidence(input: GetEvidenceInput, orgId: string) {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - (input.lookback_days || 90));

  // Use the existing compliance engine to gather evidence
  const { controls } = await getComplianceEvidence(orgId, {
    dateFrom: lookbackDate,
  });

  // Find evidence for the specific control
  const controlEvidence = controls.find((c) => c.controlCode === input.control_code);

  if (!controlEvidence) {
    return {
      control_code: input.control_code,
      framework: input.framework,
      status: "no_evidence",
      evidence_count: 0,
      evidence_items: [],
      message: "No evidence found for this control in the specified lookback period.",
    };
  }

  // Return summarised evidence (keep token count low)
  const topItems = controlEvidence.evidence.slice(0, 15).map((item) => ({
    type: item.type,
    title: item.title,
    description: item.description?.slice(0, 200),
    timestamp: item.timestamp,
    relevance: item.relevance,
    repository: item.repositoryFullName ?? item.repositoryName,
    url: item.url,
  }));

  return {
    control_code: input.control_code,
    framework: input.framework,
    status: controlEvidence.status,
    evidence_count: controlEvidence.evidence.length,
    evidence_items: topItems,
    effectiveness: (controlEvidence as unknown as Record<string, unknown>).effectiveness ?? null,
  };
}

async function executeGetBranchProtections(orgId: string) {
  const repos = await db.repository.findMany({
    where: { orgId, isActive: true },
    include: {
      branchProtections: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
    },
  });

  return {
    total_repos: repos.length,
    repos: repos.map((repo) => {
      const bp = repo.branchProtections[0];
      return {
        name: repo.fullName,
        default_branch: repo.defaultBranch,
        has_protection: !!bp,
        protection: bp
          ? {
              branch: bp.branch,
              require_pull_request: bp.requirePullRequest,
              required_approvals: bp.requiredApprovals,
              dismiss_stale_reviews: bp.dismissStaleReviews,
              require_code_owners: bp.requireCodeOwners,
              enforce_admins: bp.enforceAdmins,
              require_status_checks: bp.requireStatusChecks,
              snapshot_at: bp.snapshotAt,
            }
          : null,
      };
    }),
  };
}

async function executeGetPRQuality(orgId: string, lookbackDays: number) {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  const repos = await db.repository.findMany({
    where: { orgId, isActive: true },
    select: { id: true },
  });
  const repoIds = repos.map((r) => r.id);

  const prs = await db.pullRequest.findMany({
    where: {
      repoId: { in: repoIds },
      state: "merged",
      mergedAt: { gte: lookbackDate },
    },
    include: {
      reviews: true,
    },
    orderBy: { mergedAt: "desc" },
    take: 200,
  });

  const totalMerged = prs.length;
  if (totalMerged === 0) {
    return {
      total_merged_prs: 0,
      message: "No merged PRs found in the lookback period.",
    };
  }

  let withReviews = 0;
  let withSubstantiveComments = 0;
  let withChangesRequested = 0;
  let selfMerges = 0;
  let rubberStamps = 0;
  const reviewTimes: number[] = [];

  for (const pr of prs) {
    const reviews = pr.reviews || [];
    if (reviews.length > 0) {
      withReviews++;

      const hasComments = reviews.some((r) => r.body && r.body.trim().length > 10);
      if (hasComments) withSubstantiveComments++;

      const hasChangesRequested = reviews.some((r) => r.state === "CHANGES_REQUESTED");
      if (hasChangesRequested) withChangesRequested++;

      // Rubber stamp: approved within 60 seconds with no comments
      const quickApprovals = reviews.filter(
        (r) =>
          r.state === "APPROVED" &&
          (!r.body || r.body.trim().length === 0) &&
          r.submittedAt &&
          pr.createdAt &&
          r.submittedAt.getTime() - pr.createdAt.getTime() < 60_000
      );
      if (
        quickApprovals.length > 0 &&
        reviews.every((r) => r.state === "APPROVED" || r.state === "COMMENTED")
      ) {
        rubberStamps++;
      }

      // Review time: time from PR creation to first review
      const firstReview = reviews
        .filter((r) => r.submittedAt)
        .sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0))[0];
      if (firstReview?.submittedAt && pr.createdAt) {
        const hours = (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / 3_600_000;
        reviewTimes.push(hours);
      }
    }

    // Self-merge: author is the only reviewer and approved
    const isSelfMerge =
      reviews.length > 0 && reviews.every((r) => r.reviewerLogin === pr.authorLogin);
    if (isSelfMerge || reviews.length === 0) selfMerges++;
  }

  const avgReviewTimeHours =
    reviewTimes.length > 0 ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length : null;

  return {
    total_merged_prs: totalMerged,
    prs_with_reviews: withReviews,
    review_rate_percent: Math.round((withReviews / totalMerged) * 100),
    prs_with_substantive_comments: withSubstantiveComments,
    substantive_comment_rate_percent: Math.round((withSubstantiveComments / totalMerged) * 100),
    prs_with_changes_requested: withChangesRequested,
    changes_requested_rate_percent: Math.round((withChangesRequested / totalMerged) * 100),
    self_merge_count: selfMerges,
    self_merge_rate_percent: Math.round((selfMerges / totalMerged) * 100),
    rubber_stamp_count: rubberStamps,
    rubber_stamp_rate_percent: Math.round((rubberStamps / totalMerged) * 100),
    avg_review_time_hours: avgReviewTimeHours ? Math.round(avgReviewTimeHours * 10) / 10 : null,
    lookback_days: lookbackDays,
  };
}

async function executeGetRepoConfig(orgId: string) {
  const repos = await db.repository.findMany({
    where: { orgId, isActive: true },
    include: {
      branchProtections: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          commits: true,
          pullRequests: true,
        },
      },
    },
  });

  const ciArtifacts = await db.cIArtifact.findMany({
    where: { orgId },
    select: { artifactType: true },
  });

  const deploymentEnvs = await db.deploymentEnvironment.findMany({
    where: { orgId },
    select: {
      name: true,
      requireReviewers: true,
      reviewerCount: true,
      preventSelfReview: true,
    },
  });

  const artifactCounts: Record<string, number> = {};
  for (const a of ciArtifacts) {
    artifactCounts[a.artifactType] = (artifactCounts[a.artifactType] || 0) + 1;
  }

  return {
    total_repos: repos.length,
    repos: repos.map((r) => ({
      name: r.fullName,
      default_branch: r.defaultBranch,
      is_private: r.isPrivate,
      has_branch_protection: r.branchProtections.length > 0,
      commit_count: r._count.commits,
      pr_count: r._count.pullRequests,
      last_synced: r.lastSyncedAt,
    })),
    ci_artifacts: artifactCounts,
    deployment_environments: deploymentEnvs,
  };
}

async function executeGetAccessControl(orgId: string) {
  // Get recent membership events
  const recentEvents = await db.orgMembershipEvent.findMany({
    where: { orgId },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });

  // Get branch protections to check admin enforcement
  const accessRepos = await db.repository.findMany({
    where: { orgId, isActive: true },
    include: {
      branchProtections: {
        orderBy: { snapshotAt: "desc" },
        take: 1,
      },
    },
  });

  const adminEnforced = accessRepos.filter((r) => r.branchProtections[0]?.enforceAdmins === true);

  return {
    total_repos: accessRepos.length,
    repos_with_admin_enforcement: adminEnforced.length,
    admin_enforcement_rate_percent:
      accessRepos.length > 0 ? Math.round((adminEnforced.length / accessRepos.length) * 100) : 0,
    recent_membership_events: recentEvents.slice(0, 20).map((e) => ({
      action: e.action,
      github_login: e.githubLogin,
      role: e.role,
      previous_role: e.previousRole,
      occurred_at: e.occurredAt,
    })),
    total_membership_events: recentEvents.length,
  };
}

async function executeGetDependabotPatchLag(orgId: string, lookbackDays: number) {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Get webhook events for dependabot alerts
  const alertEvents = await db.webhookEvent.findMany({
    where: {
      orgId,
      eventType: "dependabot_alert",
      createdAt: { gte: lookbackDate },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Group by alert action
  const created = alertEvents.filter(
    (e) => (e.payload as Record<string, unknown>)?.action === "created"
  );
  const fixed = alertEvents.filter(
    (e) => (e.payload as Record<string, unknown>)?.action === "fixed"
  );

  return {
    total_alert_events: alertEvents.length,
    alerts_created: created.length,
    alerts_fixed: fixed.length,
    lookback_days: lookbackDays,
    message:
      alertEvents.length === 0
        ? "No Dependabot alert webhook events found. Either no alerts exist or webhook is not configured for dependabot_alert events."
        : `Found ${alertEvents.length} Dependabot alert events in the last ${lookbackDays} days.`,
  };
}

async function executeGetDeploymentApproval(orgId: string) {
  const deploymentEnvs = await db.deploymentEnvironment.findMany({
    where: { orgId },
  });

  const withReviewers = deploymentEnvs.filter((d) => d.requireReviewers);
  const withSelfReviewPrevention = deploymentEnvs.filter((d) => d.preventSelfReview);

  return {
    total_environments: deploymentEnvs.length,
    environments_requiring_reviewers: withReviewers.length,
    environments_preventing_self_review: withSelfReviewPrevention.length,
    environments: deploymentEnvs.map((d) => ({
      name: d.name,
      require_reviewers: d.requireReviewers,
      reviewer_count: d.reviewerCount,
      prevent_self_review: d.preventSelfReview,
    })),
    message:
      deploymentEnvs.length === 0
        ? "No deployment environments configured. GitHub deployment environments need to be set up for approval-gated deployments."
        : undefined,
  };
}

async function executeCreateHumanTask(input: CreateHumanTaskInput) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + input.days_until_due);

  const task = await db.humanTask.create({
    data: {
      orgId: input.org_id,
      controlCode: input.control_code,
      controlName: input.control_name,
      frameworkName: input.framework,
      taskType: input.task_type,
      title: input.task_title,
      description: input.task_description,
      prePopulatedTemplate: input.pre_populated_template
        ? JSON.parse(JSON.stringify(input.pre_populated_template))
        : undefined,
      dueDate,
      status: "pending",
      agentRunId: (input as unknown as Record<string, string>).agent_run_id ?? undefined,
    },
  });

  return {
    success: true,
    task_id: task.id,
    due_date: dueDate.toISOString(),
    message: `Human task created: "${input.task_title}" due ${dueDate.toLocaleDateString()}`,
  };
}

async function executeSaveAssessment(input: SaveAssessmentInput) {
  const assessment = await db.controlAssessment.create({
    data: {
      agentRunId: input.agent_run_id,
      orgId: input.org_id,
      controlCode: input.control_code,
      frameworkName: input.framework,
      controlName: input.control_name,
      sufficiencyRating: input.sufficiency_rating,
      confidenceScore: input.confidence_score,
      evidenceRecords: input.evidence_records ?? [],
      agentReasoning: input.agent_reasoning,
      auditNarrative: input.audit_narrative,
      remediationPlan: input.remediation_plan,
      remediationType: input.remediation_type ?? "none",
      remediationArtifact: input.remediation_artifact
        ? JSON.parse(JSON.stringify(input.remediation_artifact))
        : undefined,
    },
  });

  // Update the agent run counters
  const updateData: Record<string, unknown> = {
    controlsAssessed: { increment: 1 },
  };
  if (input.sufficiency_rating === "sufficient") {
    updateData.controlsSufficient = { increment: 1 };
  } else if (input.sufficiency_rating === "partial") {
    updateData.controlsPartial = { increment: 1 };
  } else {
    updateData.controlsInsufficient = { increment: 1 };
  }

  await db.agentRun.update({
    where: { id: input.agent_run_id },
    data: updateData,
  });

  return {
    success: true,
    assessment_id: assessment.id,
    sufficiency_rating: input.sufficiency_rating,
    confidence_score: input.confidence_score,
  };
}
