/**
 * GitHub Webhook Event Handlers
 *
 * Processes incoming GitHub webhook events and updates the database.
 * Reuses existing upsert patterns from lib/github-sync.ts.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invalidateCache, getCacheKey } from "@/lib/cache";
import { DATA_LIMITS } from "@/lib/constants";
import type {
  PushWebhookPayload,
  PullRequestWebhookPayload,
  PullRequestReviewWebhookPayload,
  MemberWebhookPayload,
  OrganizationWebhookPayload,
  WorkflowRunWebhookPayload,
  DependabotAlertWebhookPayload,
  CodeScanningAlertWebhookPayload,
  SecretScanningAlertWebhookPayload,
  BranchProtectionRuleWebhookPayload,
  DeploymentStatusWebhookPayload,
  ReleaseWebhookPayload,
  RepositoryWebhookPayload,
  PublicWebhookPayload,
  TeamWebhookPayload,
  SecurityAndAnalysisWebhookPayload,
  DeployKeyWebhookPayload,
  RepositoryRulesetWebhookPayload,
} from "@/types/webhook";

/**
 * Resolves a repository from the database by its GitHub full name and org.
 */
async function resolveRepo(orgId: string, fullName: string) {
  return db.repository.findFirst({
    where: { orgId, fullName, isActive: true },
    select: { id: true, orgId: true, fullName: true, defaultBranch: true },
  });
}

/**
 * Updates the lastWebhookAt timestamp for a repository.
 */
async function touchRepoWebhook(repoId: string) {
  await db.repository.update({
    where: { id: repoId },
    data: { lastWebhookAt: new Date() },
  });
}

/**
 * Invalidates the compliance evidence cache for an org.
 */
async function invalidateEvidenceCache(orgId: string) {
  try {
    await invalidateCache(getCacheKey("evidence", orgId));
    await invalidateCache(getCacheKey("compliance", orgId, "score"));
  } catch {
    // Non-critical - cache will expire naturally
  }
}

// =============================================================================
// Push Event Handler (commits)
// =============================================================================

export async function handlePushEvent(orgId: string, payload: PushWebhookPayload): Promise<void> {
  const repo = await resolveRepo(orgId, payload.repository.full_name);
  if (!repo) {
    logger.warn(`Webhook push: repo not found for ${payload.repository.full_name} in org ${orgId}`);
    return;
  }

  const commits = payload.commits || [];
  if (commits.length === 0) return;

  let count = 0;
  for (const commit of commits) {
    try {
      await db.commit.upsert({
        where: {
          repoId_sha: {
            repoId: repo.id,
            sha: commit.id,
          },
        },
        update: {},
        create: {
          repoId: repo.id,
          sha: commit.id,
          message: commit.message.slice(0, DATA_LIMITS.MAX_COMMIT_MESSAGE_LENGTH),
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          committedAt: new Date(commit.timestamp),
          url: commit.url,
          verified: false,
          verificationReason: null,
        },
      });
      count++;
    } catch (error) {
      logger.error(`Webhook: error upserting commit ${commit.id}`, error);
    }
  }

  await touchRepoWebhook(repo.id);
  await invalidateEvidenceCache(orgId);
  logger.info(`Webhook push: upserted ${count} commits for ${repo.fullName}`);
}

// =============================================================================
// Pull Request Event Handler
// =============================================================================

export async function handlePullRequestEvent(
  orgId: string,
  payload: PullRequestWebhookPayload
): Promise<void> {
  const repo = await resolveRepo(orgId, payload.repository.full_name);
  if (!repo) {
    logger.warn(`Webhook PR: repo not found for ${payload.repository.full_name} in org ${orgId}`);
    return;
  }

  const pr = payload.pull_request;

  try {
    await db.pullRequest.upsert({
      where: {
        repoId_githubPrId: {
          repoId: repo.id,
          githubPrId: BigInt(pr.id),
        },
      },
      update: {
        title: pr.title,
        body: pr.body?.slice(0, DATA_LIMITS.MAX_PR_BODY_LENGTH) || null,
        state: pr.merged_at ? "merged" : pr.state,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      },
      create: {
        repoId: repo.id,
        githubPrId: BigInt(pr.id),
        number: pr.number,
        title: pr.title,
        body: pr.body?.slice(0, DATA_LIMITS.MAX_PR_BODY_LENGTH) || null,
        state: pr.merged_at ? "merged" : pr.state,
        authorLogin: pr.user.login,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        url: pr.html_url,
      },
    });

    await touchRepoWebhook(repo.id);
    await invalidateEvidenceCache(orgId);
    logger.info(`Webhook PR: upserted PR #${pr.number} for ${repo.fullName}`);
  } catch (error) {
    logger.error(`Webhook: error upserting PR #${pr.number}`, error);
  }
}

// =============================================================================
// Pull Request Review Event Handler
// =============================================================================

export async function handlePullRequestReviewEvent(
  orgId: string,
  payload: PullRequestReviewWebhookPayload
): Promise<void> {
  const repo = await resolveRepo(orgId, payload.repository.full_name);
  if (!repo) return;

  const review = payload.review;
  const pr = payload.pull_request;

  // First ensure the PR exists in our DB
  const dbPr = await db.pullRequest.findUnique({
    where: {
      repoId_githubPrId: {
        repoId: repo.id,
        githubPrId: BigInt(pr.id),
      },
    },
    select: { id: true },
  });

  if (!dbPr) {
    logger.warn(`Webhook review: PR #${pr.number} not found in DB, skipping review`);
    return;
  }

  try {
    await db.review.upsert({
      where: {
        prId_githubReviewId: {
          prId: dbPr.id,
          githubReviewId: BigInt(review.id),
        },
      },
      update: {
        state: review.state,
        body: review.body?.slice(0, DATA_LIMITS.MAX_REVIEW_BODY_LENGTH) || null,
      },
      create: {
        prId: dbPr.id,
        githubReviewId: BigInt(review.id),
        reviewerLogin: review.user.login,
        state: review.state,
        body: review.body?.slice(0, DATA_LIMITS.MAX_REVIEW_BODY_LENGTH) || null,
        submittedAt: new Date(review.submitted_at),
      },
    });

    await touchRepoWebhook(repo.id);
    await invalidateEvidenceCache(orgId);
    logger.info(`Webhook review: upserted review on PR #${pr.number} for ${repo.fullName}`);
  } catch (error) {
    logger.error(`Webhook: error upserting review on PR #${pr.number}`, error);
  }
}

// =============================================================================
// Member Event Handler (org membership changes)
// =============================================================================

export async function handleMemberEvent(
  orgId: string,
  payload: MemberWebhookPayload
): Promise<void> {
  const member = payload.member;

  let action: string;
  const role: string | null = null;
  let previousRole: string | null = null;

  switch (payload.action) {
    case "added":
      action = "added";
      break;
    case "removed":
      action = "removed";
      break;
    case "edited":
      action = "role_changed";
      previousRole = payload.changes?.role_name?.from || null;
      break;
    default:
      logger.info(`Webhook member: unhandled action ${payload.action}`);
      return;
  }

  try {
    await db.orgMembershipEvent.create({
      data: {
        orgId,
        githubLogin: member.login,
        githubUserId: member.id,
        action,
        role,
        previousRole,
        occurredAt: new Date(),
      },
    });

    await invalidateEvidenceCache(orgId);
    logger.info(`Webhook member: recorded ${action} for ${member.login} in org ${orgId}`);
  } catch (error) {
    logger.error(`Webhook: error recording member event for ${member.login}`, error);
  }
}

// =============================================================================
// Organization Event Handler
// =============================================================================

export async function handleOrganizationEvent(
  orgId: string,
  payload: OrganizationWebhookPayload
): Promise<void> {
  const membership = payload.membership;
  if (!membership) return;

  let action: string;
  switch (payload.action) {
    case "member_added":
      action = "added";
      break;
    case "member_removed":
      action = "removed";
      break;
    default:
      logger.info(`Webhook org: unhandled action ${payload.action}`);
      return;
  }

  try {
    await db.orgMembershipEvent.create({
      data: {
        orgId,
        githubLogin: membership.user.login,
        githubUserId: membership.user.id,
        action,
        role: membership.role,
        occurredAt: new Date(),
      },
    });

    await invalidateEvidenceCache(orgId);
    logger.info(
      `Webhook org: recorded ${action} for ${membership.user.login} (role: ${membership.role})`
    );
  } catch (error) {
    logger.error(`Webhook: error recording org event`, error);
  }
}

// =============================================================================
// Workflow Run Event Handler (CI artifact fetching)
// =============================================================================

export async function handleWorkflowRunEvent(
  orgId: string,
  payload: WorkflowRunWebhookPayload
): Promise<void> {
  if (payload.action !== "completed") return;
  if (payload.workflow_run.conclusion !== "success") return;

  const repo = await resolveRepo(orgId, payload.repository.full_name);
  if (!repo) return;

  const runId = payload.workflow_run.id.toString();

  // Defer to ci-artifacts module for actual artifact processing.
  // This is imported dynamically to avoid circular dependencies.
  try {
    const { processWorkflowRunArtifacts } = await import("@/lib/ci-artifacts");
    await processWorkflowRunArtifacts(orgId, repo.id, runId);
    await invalidateEvidenceCache(orgId);
  } catch (error) {
    logger.error(`Webhook: error processing workflow run artifacts for run ${runId}`, error);
  }
}

// =============================================================================
// Dependabot Alert Handler (vulnerability management evidence)
// Maps to: A.12.6.1, A.14.2.8, SOC2-CC7.1
// =============================================================================

export async function handleDependabotAlertEvent(
  orgId: string,
  payload: DependabotAlertWebhookPayload
): Promise<void> {
  const { action, alert, repository } = payload;
  const pkg = alert.dependency?.package;
  const advisory = alert.security_advisory;
  const severity = advisory?.severity ?? "medium";

  // Only create alerts for high/critical findings
  const isHighSeverity = severity === "critical" || severity === "high";

  if (action === "created" && isHighSeverity) {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "dependabot_vulnerability",
          severity,
          title: `${severity.toUpperCase()} vulnerability in ${pkg?.name ?? "dependency"} (${repository.name})`,
          description:
            advisory?.summary ??
            `A ${severity} severity vulnerability was detected in ${pkg?.name ?? "a dependency"}.`,
          metadata: {
            alertNumber: alert.number,
            repository: repository.full_name,
            package: pkg?.name,
            ecosystem: pkg?.ecosystem,
            ghsaId: advisory?.ghsa_id,
            cveId: advisory?.cve_id,
            patchedVersion: alert.security_vulnerability?.first_patched_version?.identifier ?? null,
            htmlUrl: alert.html_url,
          },
        },
      });
      logger.info(
        `Webhook dependabot: created ${severity} alert for ${pkg?.name} in ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating dependabot alert`, error);
    }
  } else if (action === "fixed" || action === "auto_dismissed" || action === "dismissed") {
    // Resolve any open alert for this alert number
    try {
      const existing = await db.complianceAlert.findFirst({
        where: {
          orgId,
          type: "dependabot_vulnerability",
          resolvedAt: null,
          metadata: { path: ["alertNumber"], equals: alert.number },
        },
        select: { id: true },
      });
      if (existing) {
        await db.complianceAlert.update({
          where: { id: existing.id },
          data: { resolvedAt: new Date() },
        });
        logger.info(`Webhook dependabot: resolved alert #${alert.number} (${action})`);
      }
    } catch (error) {
      logger.error(`Webhook: error resolving dependabot alert`, error);
    }
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Code Scanning Alert Handler (SAST findings evidence)
// Maps to: A.14.2.1, A.14.2.5, SOC2-CC7.1
// =============================================================================

export async function handleCodeScanningAlertEvent(
  orgId: string,
  payload: CodeScanningAlertWebhookPayload
): Promise<void> {
  const { action, alert, repository } = payload;
  const secSeverity = alert.rule?.security_severity_level;
  const ruleSeverity = alert.rule?.severity; // "error" | "warning" | "note" | "none"

  // Map to our severity: error/critical/high only
  const isActionable =
    secSeverity === "critical" || secSeverity === "high" || ruleSeverity === "error";

  const severity =
    secSeverity === "critical" ? "critical" : secSeverity === "high" ? "high" : "medium";

  if (
    (action === "created" || action === "appeared_in_branch" || action === "reopened") &&
    isActionable
  ) {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "code_scanning",
          severity,
          title: `Code scanning: ${alert.rule?.description ?? alert.rule?.id} (${repository.name})`,
          description: `${alert.tool?.name ?? "SAST tool"} detected a ${severity} severity issue: ${alert.rule?.description ?? alert.rule?.id}.`,
          metadata: {
            alertNumber: alert.number,
            repository: repository.full_name,
            ruleId: alert.rule?.id,
            ruleDescription: alert.rule?.description,
            toolName: alert.tool?.name,
            htmlUrl: alert.html_url,
          },
        },
      });
      logger.info(
        `Webhook code-scanning: created ${severity} alert for rule ${alert.rule?.id} in ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating code scanning alert`, error);
    }
  } else if (action === "fixed" || action === "closed_by_user") {
    try {
      const existing = await db.complianceAlert.findFirst({
        where: {
          orgId,
          type: "code_scanning",
          resolvedAt: null,
          metadata: { path: ["alertNumber"], equals: alert.number },
        },
        select: { id: true },
      });
      if (existing) {
        await db.complianceAlert.update({
          where: { id: existing.id },
          data: { resolvedAt: new Date() },
        });
        logger.info(`Webhook code-scanning: resolved alert #${alert.number} (${action})`);
      }
    } catch (error) {
      logger.error(`Webhook: error resolving code scanning alert`, error);
    }
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Secret Scanning Alert Handler (credential exposure evidence)
// Maps to: A.9.4.3, A.9.2.1, SOC2-CC6.1
// Always critical - an exposed secret is a critical finding.
// =============================================================================

export async function handleSecretScanningAlertEvent(
  orgId: string,
  payload: SecretScanningAlertWebhookPayload
): Promise<void> {
  const { action, alert, repository } = payload;

  if (action === "created" || action === "publicly_leaked") {
    const isPublic = action === "publicly_leaked";
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "secret_scanning",
          severity: "critical",
          title: `${isPublic ? "PUBLIC LEAK: " : ""}Secret detected in ${repository.name} (${alert.secret_type_display_name})`,
          description: `A ${alert.secret_type_display_name} was detected in repository ${repository.full_name}. ${isPublic ? "This secret has been publicly leaked and must be rotated immediately." : "Rotate this credential immediately."}`,
          metadata: {
            alertNumber: alert.number,
            repository: repository.full_name,
            secretType: alert.secret_type,
            secretTypeDisplayName: alert.secret_type_display_name,
            publiclyLeaked: isPublic,
            htmlUrl: alert.html_url,
          },
        },
      });
      logger.info(
        `Webhook secret-scanning: created CRITICAL alert for ${alert.secret_type_display_name} in ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating secret scanning alert`, error);
    }
  } else if (action === "resolved") {
    // Only resolve if legitimately handled (not just dismissed)
    const validResolutions = ["revoked", "false_positive"];
    if (alert.resolution && validResolutions.includes(alert.resolution)) {
      try {
        const existing = await db.complianceAlert.findFirst({
          where: {
            orgId,
            type: "secret_scanning",
            resolvedAt: null,
            metadata: { path: ["alertNumber"], equals: alert.number },
          },
          select: { id: true },
        });
        if (existing) {
          await db.complianceAlert.update({
            where: { id: existing.id },
            data: { resolvedAt: new Date() },
          });
          logger.info(
            `Webhook secret-scanning: resolved alert #${alert.number} (resolution: ${alert.resolution})`
          );
        }
      } catch (error) {
        logger.error(`Webhook: error resolving secret scanning alert`, error);
      }
    }
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Branch Protection Rule Handler
// Maps to: A.12.1.2, A.8.4, SOC2-CC8.1
// A deleted or weakened branch protection is a critical compliance gap.
// =============================================================================

export async function handleBranchProtectionRuleEvent(
  orgId: string,
  payload: BranchProtectionRuleWebhookPayload
): Promise<void> {
  const { action, rule, repository } = payload;

  // Only alert on deletion - editing can be tightening or loosening, deletion is always bad
  if (action === "deleted") {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "branch_protection_weakened",
          severity: "high",
          title: `Branch protection rule deleted on ${repository.name} (${rule.name})`,
          description: `The branch protection rule "${rule.name}" was deleted from ${repository.full_name}. Unprotected branches allow direct pushes without review. This is a change management control gap.`,
          metadata: {
            repository: repository.full_name,
            ruleName: rule.name,
            ruleId: rule.id,
            action,
          },
        },
      });
      logger.info(
        `Webhook branch-protection: created HIGH alert for deleted rule "${rule.name}" on ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating branch protection alert`, error);
    }
  } else {
    // created or edited - log and sync branch protection data
    logger.info(
      `Webhook branch-protection: rule ${action} "${rule.name}" on ${repository.name} (org ${orgId})`
    );
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Repository Event Handler (visibility changes, archiving, deletion)
// Maps to: A.9.1.2, A.8.4, SOC2-CC6.1
// Going from private to public is a critical access control event.
// =============================================================================

export async function handleRepositoryEvent(
  orgId: string,
  payload: RepositoryWebhookPayload
): Promise<void> {
  const { action, repository } = payload;

  if (action === "publicized") {
    // Private repo went public - critical alert
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "repository_made_public",
          severity: "critical",
          title: `Repository made public: ${repository.full_name}`,
          description: `${repository.full_name} was changed from private to public. All source code is now publicly visible. Verify this is intentional and that no secrets, PII, or proprietary code are exposed.`,
          metadata: {
            repository: repository.full_name,
            action,
            htmlUrl: repository.html_url,
          },
        },
      });
      logger.warn(
        `Webhook repository: CRITICAL alert - ${repository.full_name} made public by ${payload.sender.login}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating public repository alert`, error);
    }
  } else if (action === "deleted" || action === "archived") {
    // Repository deleted or archived - update our DB record
    try {
      await db.repository.updateMany({
        where: { orgId, fullName: repository.full_name },
        data: { isActive: false },
      });
      logger.info(`Webhook repository: marked ${repository.full_name} as inactive (${action})`);
    } catch (error) {
      logger.error(`Webhook: error marking repository as inactive`, error);
    }
  } else if (action === "privatized") {
    // Public repo went private - positive signal, just log
    logger.info(
      `Webhook repository: ${repository.full_name} made private by ${payload.sender.login}`
    );
  } else {
    logger.info(`Webhook repository: action "${action}" on ${repository.full_name}`);
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Public Event Handler (repository explicitly made public)
// Simpler payload than repository event - always a critical alert.
// Maps to: A.9.1.2, SOC2-CC6.1
// =============================================================================

export async function handlePublicEvent(
  orgId: string,
  payload: PublicWebhookPayload
): Promise<void> {
  const { repository } = payload;

  try {
    // Check for existing unresolved alert to avoid duplicates (may also come via `repository` event)
    const existing = await db.complianceAlert.findFirst({
      where: {
        orgId,
        type: "repository_made_public",
        resolvedAt: null,
        metadata: { path: ["repository"], equals: repository.full_name },
      },
      select: { id: true },
    });

    if (!existing) {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "repository_made_public",
          severity: "critical",
          title: `Repository made public: ${repository.full_name}`,
          description: `${repository.full_name} was changed to public visibility. Verify no sensitive data is exposed.`,
          metadata: {
            repository: repository.full_name,
            htmlUrl: repository.html_url,
          },
        },
      });
      logger.warn(`Webhook public: CRITICAL - ${repository.full_name} is now public`);
    }
  } catch (error) {
    logger.error(`Webhook: error handling public repository event`, error);
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Deployment Status Handler (change management evidence)
// Maps to: A.12.1.2, A.14.2.9, SOC2-CC8.1
// =============================================================================

export async function handleDeploymentStatusEvent(
  orgId: string,
  payload: DeploymentStatusWebhookPayload
): Promise<void> {
  const { deployment_status, deployment, repository } = payload;

  const repo = await resolveRepo(orgId, repository.full_name);
  if (!repo) return;

  const state = deployment_status.state;
  const environment = deployment.environment;

  // Alert on failed production deployments
  if (state === "failure" || state === "error") {
    const isProduction = /^prod/i.test(environment) || environment.toLowerCase() === "production";

    if (isProduction) {
      try {
        await db.complianceAlert.create({
          data: {
            orgId,
            type: "deployment_failure",
            severity: "medium",
            title: `Production deployment failed on ${repository.name}`,
            description: `A deployment to "${environment}" failed for ${repository.full_name} (ref: ${deployment.ref}). Document the failure and rollback steps as change management evidence.`,
            metadata: {
              repository: repository.full_name,
              environment,
              sha: deployment.sha,
              ref: deployment.ref,
              deploymentId: deployment.id,
              statusId: deployment_status.id,
              state,
              logUrl: deployment_status.log_url,
            },
          },
        });
        logger.info(
          `Webhook deployment-status: MEDIUM alert for failed production deployment on ${repository.name}`
        );
      } catch (error) {
        logger.error(`Webhook: error creating deployment failure alert`, error);
      }
    }
  }

  await touchRepoWebhook(repo.id);
  await invalidateEvidenceCache(orgId);
  logger.info(
    `Webhook deployment-status: ${state} on "${environment}" for ${repository.full_name}`
  );
}

// =============================================================================
// Release Handler (software release / change management evidence)
// Maps to: A.12.1.2, A.14.2.9, SOC2-CC8.1
// =============================================================================

export async function handleReleaseEvent(
  orgId: string,
  payload: ReleaseWebhookPayload
): Promise<void> {
  const { action, release, repository } = payload;

  if (action !== "published" && action !== "released") return;

  const repo = await resolveRepo(orgId, repository.full_name);
  if (!repo) return;

  try {
    await db.cIArtifact.upsert({
      where: {
        repoId_runId_artifactType: {
          repoId: repo.id,
          runId: `release-${release.id}`,
          artifactType: "release",
        },
      },
      update: {
        name: release.tag_name,
        summary: {
          tagName: release.tag_name,
          releaseName: release.name,
          isDraft: release.draft,
          isPrerelease: release.prerelease,
          author: release.author.login,
          publishedAt: release.published_at,
          htmlUrl: release.html_url,
        },
      },
      create: {
        repoId: repo.id,
        orgId,
        runId: `release-${release.id}`,
        name: release.tag_name,
        artifactType: "release",
        summary: {
          tagName: release.tag_name,
          releaseName: release.name,
          isDraft: release.draft,
          isPrerelease: release.prerelease,
          author: release.author.login,
          publishedAt: release.published_at,
          htmlUrl: release.html_url,
        },
      },
    });

    await touchRepoWebhook(repo.id);
    await invalidateEvidenceCache(orgId);
    logger.info(`Webhook release: recorded ${release.tag_name} for ${repository.full_name}`);
  } catch (error) {
    logger.error(`Webhook: error recording release`, error);
  }
}

// =============================================================================
// Team Event Handler (access management evidence)
// Maps to: A.9.2.1, A.9.2.2, SOC2-CC6.2, CC6.3
// =============================================================================

export async function handleTeamEvent(orgId: string, payload: TeamWebhookPayload): Promise<void> {
  const { action, team, changes } = payload;

  if (action === "added_to_repository" || action === "removed_from_repository") {
    const repoName = payload.repository?.full_name ?? "unknown";
    try {
      await db.orgMembershipEvent.create({
        data: {
          orgId,
          githubLogin: `team:${team.slug}`,
          githubUserId: team.id,
          action: action === "added_to_repository" ? "added" : "removed",
          role: `team_${team.permission ?? "member"}`,
          occurredAt: new Date(),
        },
      });
      logger.info(`Webhook team: ${action} "${team.name}" (${team.permission}) on ${repoName}`);
    } catch (error) {
      logger.error(`Webhook: error recording team access event`, error);
    }
  } else if (action === "edited" && changes?.permission) {
    const from = changes.permission.from;
    const to = team.permission;
    const isEscalation =
      (from === "pull" || from === "triage") &&
      (to === "push" || to === "maintain" || to === "admin");

    if (isEscalation) {
      try {
        await db.complianceAlert.create({
          data: {
            orgId,
            type: "access_escalation",
            severity: "medium",
            title: `Team "${team.name}" permission escalated: ${from} → ${to}`,
            description: `The team "${team.name}" had its repository permission escalated from "${from}" to "${to}". Review this change against least-privilege access principles (A.9.2.2, SOC2-CC6.3).`,
            metadata: {
              teamName: team.name,
              teamSlug: team.slug,
              teamId: team.id,
              permissionFrom: from,
              permissionTo: to,
            },
          },
        });
        logger.info(
          `Webhook team: MEDIUM alert - permission escalation on team "${team.name}" (${from} → ${to})`
        );
      } catch (error) {
        logger.error(`Webhook: error creating team permission alert`, error);
      }
    } else {
      logger.info(`Webhook team: permission changed for "${team.name}": ${from} → ${to}`);
    }
  } else {
    logger.info(`Webhook team: action "${action}" on team "${team.name}"`);
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Security and Analysis Handler (security feature enable/disable)
// Maps to: A.12.6.1, A.14.2.1, SOC2-CC7.1
// =============================================================================

export async function handleSecurityAndAnalysisEvent(
  orgId: string,
  payload: SecurityAndAnalysisWebhookPayload
): Promise<void> {
  const { changes, repository } = payload;
  const secAnalysis = changes.security_and_analysis;
  if (!secAnalysis) return;

  const disabledFeatures: string[] = [];
  const featureLabels: Record<string, string> = {
    advanced_security: "GitHub Advanced Security",
    secret_scanning: "Secret Scanning",
    secret_scanning_push_protection: "Secret Scanning Push Protection",
    dependabot_security_updates: "Dependabot Security Updates",
  };

  for (const [key, label] of Object.entries(featureLabels)) {
    const change = secAnalysis[key as keyof typeof secAnalysis];
    if (change && change.to === "disabled") {
      disabledFeatures.push(label);
    }
  }

  if (disabledFeatures.length > 0) {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "security_feature_disabled",
          severity: "high",
          title: `Security feature disabled on ${repository.name}: ${disabledFeatures.join(", ")}`,
          description: `The following security feature(s) were disabled on ${repository.full_name}: ${disabledFeatures.join(", ")}. Disabling active security monitoring creates gaps in vulnerability management controls (A.12.6.1, SOC2-CC7.1).`,
          metadata: {
            repository: repository.full_name,
            disabledFeatures,
            changes: secAnalysis,
          },
        },
      });
      logger.warn(
        `Webhook security-analysis: HIGH alert - disabled [${disabledFeatures.join(", ")}] on ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating security feature disabled alert`, error);
    }
  } else {
    logger.info(
      `Webhook security-analysis: security features updated on ${repository.full_name} (enabled)`
    );
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Deploy Key Handler (access control evidence)
// Maps to: A.9.2.1, A.9.4.2, SOC2-CC6.1
// Write-access deploy keys bypass normal access review processes.
// =============================================================================

export async function handleDeployKeyEvent(
  orgId: string,
  payload: DeployKeyWebhookPayload
): Promise<void> {
  const { action, key, repository } = payload;

  if (action === "created" && !key.read_only) {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "deploy_key_write_access",
          severity: "medium",
          title: `Write-access deploy key added to ${repository.name}: "${key.title}"`,
          description: `A write-access deploy key titled "${key.title}" was added to ${repository.full_name}. Write-access deploy keys bypass normal access control review. Ensure it is necessary, documented, and rotated regularly.`,
          metadata: {
            repository: repository.full_name,
            keyTitle: key.title,
            keyId: key.id,
            readOnly: key.read_only,
            verified: key.verified,
            createdAt: key.created_at,
          },
        },
      });
      logger.info(
        `Webhook deploy-key: MEDIUM alert - write-access key "${key.title}" added to ${repository.name}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating deploy key alert`, error);
    }
  } else if (action === "deleted") {
    try {
      const existing = await db.complianceAlert.findFirst({
        where: {
          orgId,
          type: "deploy_key_write_access",
          resolvedAt: null,
          metadata: { path: ["keyId"], equals: key.id },
        },
        select: { id: true },
      });
      if (existing) {
        await db.complianceAlert.update({
          where: { id: existing.id },
          data: { resolvedAt: new Date() },
        });
        logger.info(`Webhook deploy-key: resolved alert for deleted key "${key.title}"`);
      }
    } catch (error) {
      logger.error(`Webhook: error resolving deploy key alert`, error);
    }
  }

  await invalidateEvidenceCache(orgId);
}

// =============================================================================
// Repository Ruleset Handler (modern branch/tag protection)
// Maps to: A.12.1.2, A.8.4, SOC2-CC8.1
// =============================================================================

export async function handleRepositoryRulesetEvent(
  orgId: string,
  payload: RepositoryRulesetWebhookPayload
): Promise<void> {
  const { action, ruleset, repository } = payload;
  const repoName = repository?.full_name ?? payload.organization?.login ?? "organization";

  if (action === "deleted" && ruleset.enforcement === "active") {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "branch_protection_weakened",
          severity: "high",
          title: `Repository ruleset deleted: "${ruleset.name}" on ${repoName}`,
          description: `The active repository ruleset "${ruleset.name}" (targeting ${ruleset.target}s) was deleted from ${repoName}. Rulesets enforce branch/tag protection. Deletion may allow unreviewed direct pushes.`,
          metadata: {
            rulesetId: ruleset.id,
            rulesetName: ruleset.name,
            target: ruleset.target,
            enforcement: ruleset.enforcement,
            source: ruleset.source,
            repository: repoName,
          },
        },
      });
      logger.info(
        `Webhook ruleset: HIGH alert - active ruleset "${ruleset.name}" deleted on ${repoName}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating ruleset deletion alert`, error);
    }
  } else if (action === "edited" && ruleset.enforcement === "disabled") {
    try {
      await db.complianceAlert.create({
        data: {
          orgId,
          type: "branch_protection_weakened",
          severity: "medium",
          title: `Repository ruleset disabled: "${ruleset.name}" on ${repoName}`,
          description: `The repository ruleset "${ruleset.name}" was disabled on ${repoName}. Disabled rulesets no longer enforce branch/tag protections.`,
          metadata: {
            rulesetId: ruleset.id,
            rulesetName: ruleset.name,
            target: ruleset.target,
            enforcement: ruleset.enforcement,
            repository: repoName,
          },
        },
      });
      logger.info(
        `Webhook ruleset: MEDIUM alert - ruleset "${ruleset.name}" disabled on ${repoName}`
      );
    } catch (error) {
      logger.error(`Webhook: error creating ruleset disabled alert`, error);
    }
  } else {
    logger.info(
      `Webhook ruleset: action "${action}" on "${ruleset.name}" (${ruleset.enforcement}) for ${repoName}`
    );
  }

  await invalidateEvidenceCache(orgId);
}
