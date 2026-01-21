import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGitHubClientForOrg, GitHubClient } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    let body: { repositoryId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is okay for syncing all repos
    }

    const { repositoryId } = body;

    const client = await getGitHubClientForOrg(orgId);
    if (!client) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
    }

    // Get repositories to sync
    const whereClause = repositoryId
      ? { id: repositoryId, orgId, isActive: true }
      : { orgId, isActive: true };

    const repositories = await db.repository.findMany({
      where: whereClause,
    });

    if (repositories.length === 0) {
      return NextResponse.json(
        { error: "No repositories to sync" },
        { status: 400 }
      );
    }

    const results = [];

    for (const repo of repositories) {
      try {
        // Validate fullName format
        if (!repo.fullName || !repo.fullName.includes("/")) {
          results.push({
            repository: repo.fullName || repo.name,
            error: "Invalid repository name format",
          });
          continue;
        }

        const [owner, repoName] = repo.fullName.split("/");
        if (!owner || !repoName) {
          results.push({
            repository: repo.fullName,
            error: "Invalid repository name format",
          });
          continue;
        }

        const since =
          repo.lastSyncedAt ||
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

        // Sync commits
        const commits = await syncCommits(client, repo.id, owner, repoName, since);

        // Sync pull requests and reviews
        const prs = await syncPullRequests(client, repo.id, owner, repoName);

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

        results.push({
          repository: repo.fullName,
          commits: commits.count,
          pullRequests: prs.count,
          reviews: prs.reviewCount,
          branchProtection: protection ? "synced" : "not configured",
        });
      } catch (error) {
        console.error(`Error syncing ${repo.fullName}:`, error);
        results.push({
          repository: repo.fullName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync repositories" },
      { status: 500 }
    );
  }
}

async function syncCommits(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  since: Date
) {
  let page = 1;
  let count = 0;
  const maxPages = 10; // Limit to prevent excessive API calls

  while (page <= maxPages) {
    const commits = await client.getCommits(owner, repoName, since, page);
    if (commits.length === 0) break;

    for (const commit of commits) {
      try {
        await db.commit.upsert({
          where: {
            repoId_sha: {
              repoId,
              sha: commit.sha,
            },
          },
          update: {},
          create: {
            repoId,
            sha: commit.sha,
            message: commit.commit.message.slice(0, 5000), // Limit message length
            authorName: commit.commit.author.name,
            authorEmail: commit.commit.author.email,
            committedAt: new Date(commit.commit.author.date),
            url: commit.html_url,
          },
        });
        count++;
      } catch (error) {
        console.error(`Error upserting commit ${commit.sha}:`, error);
      }
    }

    if (commits.length < 100) break;
    page++;
  }

  return { count };
}

async function syncPullRequests(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string
) {
  let page = 1;
  let count = 0;
  let reviewCount = 0;
  const maxPages = 5;

  while (page <= maxPages) {
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
            body: pr.body?.slice(0, 10000) || null,
            state: pr.merged_at ? "merged" : pr.state,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
          },
          create: {
            repoId,
            githubPrId: BigInt(pr.id),
            number: pr.number,
            title: pr.title,
            body: pr.body?.slice(0, 10000) || null,
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
          for (const review of reviews) {
            try {
              await db.review.upsert({
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
                  body: review.body?.slice(0, 5000) || null,
                  submittedAt: new Date(review.submitted_at),
                },
              });
              reviewCount++;
            } catch (error) {
              console.error(`Error upserting review:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error upserting PR ${pr.number}:`, error);
      }
    }

    if (prs.length < 100) break;
    page++;
  }

  return { count, reviewCount };
}

async function syncBranchProtection(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  branch: string
) {
  try {
    const protection = await client.getBranchProtection(owner, repoName, branch);
    if (!protection) return null;

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

    return protection;
  } catch (error) {
    console.error(`Error syncing branch protection:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Get sync status for all repositories
    const repositories = await db.repository.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        fullName: true,
        lastSyncedAt: true,
        _count: {
          select: {
            commits: true,
            pullRequests: true,
            branchProtections: true,
          },
        },
      },
    });

    return NextResponse.json({
      repositories: repositories.map((repo) => ({
        id: repo.id,
        fullName: repo.fullName,
        lastSyncedAt: repo.lastSyncedAt,
        commitCount: repo._count.commits,
        pullRequestCount: repo._count.pullRequests,
        hasBranchProtection: repo._count.branchProtections > 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
