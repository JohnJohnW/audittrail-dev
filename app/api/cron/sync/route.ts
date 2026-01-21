import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGitHubClientForOrg, GitHubClient } from "@/lib/github";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";

// Cron job endpoint for automatic syncing
// Protected by CRON_SECRET to prevent unauthorized access
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron not configured" },
        { status: 500 }
      );
    }

    // Vercel Cron sends the secret as Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting scheduled sync...");

    // Get all organizations with active repositories
    const organizations = await db.organization.findMany({
      where: {
        repositories: {
          some: {
            isActive: true,
          },
        },
        githubConnection: {
          isNot: null,
        },
      },
      include: {
        repositories: {
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            defaultBranch: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    console.log(`Found ${organizations.length} organizations to sync`);

    const results: {
      orgId: string;
      repoCount: number;
      status: "success" | "error";
      error?: string;
    }[] = [];

    for (const org of organizations) {
      try {
        const client = await getGitHubClientForOrg(org.id);
        if (!client) {
          results.push({
            orgId: org.id,
            repoCount: 0,
            status: "error",
            error: "No GitHub connection",
          });
          continue;
        }

        let syncedRepos = 0;

        for (const repo of org.repositories) {
          try {
            if (!repo.fullName || !repo.fullName.includes("/")) {
              continue;
            }

            const [owner, repoName] = repo.fullName.split("/");
            if (!owner || !repoName) continue;

            const since =
              repo.lastSyncedAt ||
              new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            // Sync commits (limited for cron)
            await syncCommitsForCron(client, repo.id, owner, repoName, since);

            // Sync pull requests
            await syncPRsForCron(client, repo.id, owner, repoName);

            // Sync branch protection
            await syncBranchProtectionForCron(
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

            syncedRepos++;
          } catch (error) {
            console.error(`Error syncing repo ${repo.fullName}:`, error);
          }
        }

        // Store daily compliance snapshot after sync
        await storeComplianceSnapshot(org.id);

        results.push({
          orgId: org.id,
          repoCount: syncedRepos,
          status: "success",
        });
      } catch (error) {
        console.error(`Error syncing org ${org.id}:`, error);
        results.push({
          orgId: org.id,
          repoCount: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    console.log(
      `Sync completed: ${successCount}/${organizations.length} organizations synced`
    );

    return NextResponse.json({
      success: true,
      synced: successCount,
      total: organizations.length,
      results,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

// Simplified sync functions for cron (fewer pages to avoid timeouts)
async function syncCommitsForCron(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  since: Date
) {
  const maxPages = 3; // Limit pages for cron

  for (let page = 1; page <= maxPages; page++) {
    const commits = await client.getCommits(owner, repoName, since, page);
    if (commits.length === 0) break;

    for (const commit of commits) {
      try {
        await db.commit.upsert({
          where: {
            repoId_sha: { repoId, sha: commit.sha },
          },
          update: {
            verified: commit.commit.verification?.verified || false,
            verificationReason: commit.commit.verification?.reason || null,
          },
          create: {
            repoId,
            sha: commit.sha,
            message: commit.commit.message.slice(0, 5000),
            authorName: commit.commit.author.name,
            authorEmail: commit.commit.author.email,
            committedAt: new Date(commit.commit.author.date),
            url: commit.html_url,
            verified: commit.commit.verification?.verified || false,
            verificationReason: commit.commit.verification?.reason || null,
          },
        });
      } catch (error) {
        // Skip individual commit errors
      }
    }

    if (commits.length < 100) break;
  }
}

async function syncPRsForCron(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string
) {
  const maxPages = 2; // Limit for cron

  for (let page = 1; page <= maxPages; page++) {
    const prs = await client.getPullRequests(owner, repoName, "all", page);
    if (prs.length === 0) break;

    for (const pr of prs) {
      try {
        const dbPr = await db.pullRequest.upsert({
          where: {
            repoId_githubPrId: { repoId, githubPrId: BigInt(pr.id) },
          },
          update: {
            title: pr.title,
            state: pr.merged_at ? "merged" : pr.state,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
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

        // Sync reviews for merged PRs only
        if (pr.merged_at) {
          const reviews = await client.getReviews(owner, repoName, pr.number);
          for (const review of reviews.slice(0, 10)) {
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
            } catch (error) {
              // Skip individual review errors
            }
          }
        }
      } catch (error) {
        // Skip individual PR errors
      }
    }

    if (prs.length < 100) break;
  }
}

async function syncBranchProtectionForCron(
  client: GitHubClient,
  repoId: string,
  owner: string,
  repoName: string,
  branch: string
) {
  try {
    const protection = await client.getBranchProtection(owner, repoName, branch);
    if (!protection) return null;

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
    // Branch protection not configured or no access - this is okay
    return null;
  }
}

async function storeComplianceSnapshot(orgId: string) {
  try {
    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    // Calculate per-framework scores
    const frameworkScores: Record<string, { score: number; total: number; withEvidence: number }> = {};
    for (const framework of evidence.frameworks) {
      const frameworkControls = evidence.controls.filter(
        (c) => c.frameworkName === framework.name
      );
      const frameworkSummary = getEvidenceSummary(frameworkControls);
      frameworkScores[framework.name] = {
        score: frameworkSummary.score,
        total: frameworkSummary.total,
        withEvidence: frameworkSummary.withEvidence,
      };
    }

    // Use today's date for the snapshot (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await db.complianceSnapshot.upsert({
      where: {
        orgId_snapshotDate: {
          orgId,
          snapshotDate: today,
        },
      },
      update: {
        overallScore: summary.score,
        totalControls: summary.total,
        withEvidence: summary.withEvidence,
        partial: summary.partial,
        limited: summary.limited,
        noEvidence: summary.noEvidence,
        frameworkScores,
      },
      create: {
        orgId,
        snapshotDate: today,
        overallScore: summary.score,
        totalControls: summary.total,
        withEvidence: summary.withEvidence,
        partial: summary.partial,
        limited: summary.limited,
        noEvidence: summary.noEvidence,
        frameworkScores,
      },
    });

    console.log(`Stored compliance snapshot for org ${orgId}: ${summary.score}%`);
  } catch (error) {
    console.error(`Error storing compliance snapshot for org ${orgId}:`, error);
    // Don't throw - snapshot storage failure shouldn't fail the sync
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
