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
