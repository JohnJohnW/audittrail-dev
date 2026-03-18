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
    // Non-critical — cache will expire naturally
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
// Always critical — an exposed secret is a critical finding.
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
