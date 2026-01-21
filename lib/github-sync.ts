/**
 * GitHub Sync Utilities
 *
 * Shared sync functions for syncing GitHub data to the database.
 * Used by both manual sync and cron sync routes.
 */

import { db } from "@/lib/db";
import type { GitHubClient } from "@/lib/github";
import { logger } from "@/lib/logger";
import {
  SYNC_CONFIG,
  DATA_LIMITS,
  GITHUB_CONFIG,
} from "@/lib/constants";

// =============================================================================
// Types
// =============================================================================

export interface SyncOptions {
  /** Maximum pages to fetch from GitHub API */
  maxPages?: number;
  /** Batch size for parallel processing */
  batchSize?: number;
  /** Maximum reviews to fetch per PR */
  reviewLimit?: number;
  /** Whether to log detailed progress */
  verbose?: boolean;
}

export interface SyncResult {
  count: number;
  errors: number;
}

export interface CommitSyncResult extends SyncResult {}

export interface PullRequestSyncResult extends SyncResult {
  reviewCount: number;
}

export interface BranchProtectionSyncResult {
  synced: boolean;
  error?: string;
}

export interface RepositorySyncResult {
  repository: string;
  commits?: number;
  pullRequests?: number;
  reviews?: number;
  branchProtection?: "synced" | "not configured" | "error";
  error?: string;
}

// Default options for manual sync (more thorough)
const DEFAULT_SYNC_OPTIONS: Required<SyncOptions> = {
  maxPages: SYNC_CONFIG.MAX_PAGES,
  batchSize: SYNC_CONFIG.BATCH_SIZE,
  reviewLimit: SYNC_CONFIG.REVIEW_LIMIT,
  verbose: false,
};

// Options for cron sync (faster, less thorough)
export const CRON_SYNC_OPTIONS: Required<SyncOptions> = {
  maxPages: SYNC_CONFIG.CRON_MAX_PAGES,
  batchSize: SYNC_CONFIG.BATCH_SIZE,
  reviewLimit: SYNC_CONFIG.CRON_REVIEW_LIMIT,
  verbose: false,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Split an array into chunks of a specified size.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

/**
 * Parse repository fullName into owner and repo name.
 * Returns null if the format is invalid.
 */
export function parseRepoFullName(
  fullName: string
): { owner: string; repo: string } | null {
  if (!fullName || !fullName.includes("/")) {
    return null;
  }
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

// =============================================================================
// Sync Functions
// =============================================================================

/**
 * Sync commits from GitHub to the database.
 *
 * @param client - GitHub API client
 * @param repoId - Database repository ID
 * @param owner - Repository owner
 * @param repoName - Repository name
 * @param since - Only fetch commits after this date
 * @param options - Sync options
 * @returns Sync result with count of synced commits
 */
export async function syncCommits(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  since: Date,
  options: SyncOptions = {}
): Promise<CommitSyncResult> {
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };
  let page = 1;
  let count = 0;
  let errors = 0;

  while (page <= opts.maxPages) {
    const commits = await client.getCommits(owner, repoName, since, page);
    if (commits.length === 0) break;

    // Process commits in batches using Promise.allSettled for parallelization
    const batches = chunk(commits, opts.batchSize);
    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((commit) =>
          db.commit.upsert({
            where: {
              repoId_sha: {
                repoId,
                sha: commit.sha,
              },
            },
            update: {
              verified: commit.commit.verification?.verified || false,
              verificationReason: commit.commit.verification?.reason || null,
            },
            create: {
              repoId,
              sha: commit.sha,
              message: commit.commit.message.slice(
                0,
                DATA_LIMITS.MAX_COMMIT_MESSAGE_LENGTH
              ),
              authorName: commit.commit.author.name,
              authorEmail: commit.commit.author.email,
              committedAt: new Date(commit.commit.author.date),
              url: commit.html_url,
              verified: commit.commit.verification?.verified || false,
              verificationReason: commit.commit.verification?.reason || null,
            },
          })
        )
      );

      // Count successes and log failures
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "fulfilled") {
          count++;
        } else {
          errors++;
          if (opts.verbose) {
            logger.error(
              `Error upserting commit ${batch[i].sha}`,
              (results[i] as PromiseRejectedResult).reason
            );
          }
        }
      }
    }

    // Check if we've reached the end
    if (commits.length < GITHUB_CONFIG.PER_PAGE) break;
    page++;
  }

  return { count, errors };
}

/**
 * Sync pull requests and their reviews from GitHub to the database.
 *
 * @param client - GitHub API client
 * @param repoId - Database repository ID
 * @param owner - Repository owner
 * @param repoName - Repository name
 * @param options - Sync options
 * @returns Sync result with count of synced PRs and reviews
 */
export async function syncPullRequests(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  options: SyncOptions = {}
): Promise<PullRequestSyncResult> {
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };
  let page = 1;
  let count = 0;
  let reviewCount = 0;
  let errors = 0;

  // For PRs, use a different max pages setting (usually want fewer)
  const maxPrPages = Math.min(opts.maxPages, 5);

  while (page <= maxPrPages) {
    const prs = await client.getPullRequests(owner, repoName, "all", page);
    if (prs.length === 0) break;

    for (const pr of prs) {
      try {
        const dbPr = await db.pullRequest.upsert({
          where: {
            repoId_githubPrId: {
              repoId,
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
            repoId,
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
        count++;

        // Sync reviews for merged PRs
        if (pr.merged_at) {
          const reviews = await client.getReviews(owner, repoName, pr.number);
          const limitedReviews = reviews.slice(0, opts.reviewLimit);

          const reviewResults = await Promise.allSettled(
            limitedReviews.map((review) =>
              db.review.upsert({
                where: {
                  prId_githubReviewId: {
                    prId: dbPr.id,
                    githubReviewId: BigInt(review.id),
                  },
                },
                update: {},
                create: {
                  prId: dbPr.id,
                  githubReviewId: BigInt(review.id),
                  reviewerLogin: review.user.login,
                  state: review.state,
                  body:
                    review.body?.slice(0, DATA_LIMITS.MAX_REVIEW_BODY_LENGTH) ||
                    null,
                  submittedAt: new Date(review.submitted_at),
                },
              })
            )
          );

          reviewCount += reviewResults.filter(
            (r) => r.status === "fulfilled"
          ).length;
        }
      } catch (error) {
        errors++;
        if (opts.verbose) {
          logger.error(`Error upserting PR ${pr.number}`, error);
        }
      }
    }

    // Check if we've reached the end
    if (prs.length < GITHUB_CONFIG.PER_PAGE) break;
    page++;
  }

  return { count, reviewCount, errors };
}

/**
 * Sync branch protection settings from GitHub to the database.
 *
 * @param client - GitHub API client
 * @param repoId - Database repository ID
 * @param owner - Repository owner
 * @param repoName - Repository name
 * @param branch - Branch name to check protection for
 * @returns Sync result
 */
export async function syncBranchProtection(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  branch: string
): Promise<BranchProtectionSyncResult> {
  try {
    const protection = await client.getBranchProtection(owner, repoName, branch);
    if (!protection) {
      return { synced: false };
    }

    // Use upsert to avoid duplicate key errors on re-sync
    const snapshotAt = new Date();
    await db.branchProtection.upsert({
      where: {
        repoId_branch_snapshotAt: {
          repoId,
          branch,
          snapshotAt,
        },
      },
      update: {
        requirePullRequest: !!protection.required_pull_request_reviews,
        requiredApprovals:
          protection.required_pull_request_reviews
            ?.required_approving_review_count || 0,
        dismissStaleReviews:
          protection.required_pull_request_reviews?.dismiss_stale_reviews ||
          false,
        requireCodeOwners:
          protection.required_pull_request_reviews?.require_code_owner_reviews ||
          false,
        enforceAdmins: protection.enforce_admins?.enabled || false,
        requireStatusChecks: !!protection.required_status_checks,
      },
      create: {
        repoId,
        branch,
        requirePullRequest: !!protection.required_pull_request_reviews,
        requiredApprovals:
          protection.required_pull_request_reviews
            ?.required_approving_review_count || 0,
        dismissStaleReviews:
          protection.required_pull_request_reviews?.dismiss_stale_reviews ||
          false,
        requireCodeOwners:
          protection.required_pull_request_reviews?.require_code_owner_reviews ||
          false,
        enforceAdmins: protection.enforce_admins?.enabled || false,
        requireStatusChecks: !!protection.required_status_checks,
        snapshotAt,
      },
    });

    return { synced: true };
  } catch (error) {
    // Branch protection not configured or no access - this is okay
    return {
      synced: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync a single repository (commits, PRs, branch protection).
 *
 * @param client - GitHub API client
 * @param repo - Repository data
 * @param options - Sync options
 * @returns Sync result for the repository
 */
export async function syncRepository(
  client: GitHubClient,
  repo: {
    id: string;
    fullName: string;
    defaultBranch: string;
    lastSyncedAt: Date | null;
  },
  options: SyncOptions = {}
): Promise<RepositorySyncResult> {
  const parsed = parseRepoFullName(repo.fullName);
  if (!parsed) {
    return {
      repository: repo.fullName,
      error: "Invalid repository name format",
    };
  }

  const { owner, repo: repoName } = parsed;
  const since =
    repo.lastSyncedAt ||
    new Date(
      Date.now() - SYNC_CONFIG.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000
    );

  try {
    // Sync commits
    const commits = await syncCommits(
      client,
      repo.id,
      owner,
      repoName,
      since,
      options
    );

    // Sync pull requests and reviews
    const prs = await syncPullRequests(
      client,
      repo.id,
      owner,
      repoName,
      options
    );

    // Sync branch protection
    const protection = await syncBranchProtection(
      client,
      repo.id,
      owner,
      repoName,
      repo.defaultBranch
    );

    // Update last synced timestamp
    await db.repository.update({
      where: { id: repo.id },
      data: { lastSyncedAt: new Date() },
    });

    return {
      repository: repo.fullName,
      commits: commits.count,
      pullRequests: prs.count,
      reviews: prs.reviewCount,
      branchProtection: protection.synced ? "synced" : "not configured",
    };
  } catch (error) {
    logger.error(`Error syncing ${repo.fullName}`, error);
    return {
      repository: repo.fullName,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the default sync since date based on lastSyncedAt or default days back.
 */
export function getSyncSinceDate(lastSyncedAt: Date | null): Date {
  return (
    lastSyncedAt ||
    new Date(Date.now() - SYNC_CONFIG.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000)
  );
}
