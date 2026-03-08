import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGitHubClientForOrg } from "@/lib/github";
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
import { sendWeeklyDigest } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { syncRepository, CRON_SYNC_OPTIONS } from "@/lib/github-sync";
import { detectAndCreateAlerts } from "@/lib/alerts";
import { computeIndustryBenchmarks } from "@/lib/benchmarks";

// Cron job endpoint for automatic syncing
// Protected by CRON_SECRET to prevent unauthorized access
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
    }

    // Verify using timing-safe comparison to prevent timing oracle attacks
    const expected = `Bearer ${cronSecret}`;
    const provided = authHeader ?? "";
    const isValid =
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting scheduled sync");

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

    logger.info(`Found ${organizations.length} organizations to sync`);

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

        // Sync each repository using the shared lib helper with cron-optimised options
        const syncResults = await Promise.allSettled(
          org.repositories.map((repo) => syncRepository(client, repo, CRON_SYNC_OPTIONS))
        );

        const syncedRepos = syncResults.filter(
          (r) => r.status === "fulfilled" && !r.value.error
        ).length;

        // Store daily compliance snapshot after sync
        await storeComplianceSnapshot(org.id);

        // Detect compliance regressions and create alerts (non-blocking)
        detectAndCreateAlerts(org.id, org.repositories).catch((err) =>
          logger.warn("Alert detection failed", { orgId: org.id, error: String(err) })
        );

        // Send weekly digest on Mondays (cron runs at 2am UTC daily)
        const today = new Date();
        if (today.getUTCDay() === 1) {
          await sendWeeklyDigestForOrg(org.id, syncedRepos).catch((err) =>
            logger.warn("Weekly digest failed for org", { orgId: org.id, error: String(err) })
          );
        }

        results.push({
          orgId: org.id,
          repoCount: syncedRepos,
          status: "success",
        });
      } catch (error) {
        logger.error(`Error syncing org ${org.id}`, error);
        results.push({
          orgId: org.id,
          repoCount: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    logger.info(`Sync completed: ${successCount}/${organizations.length} organizations synced`);

    // Recompute industry benchmarks once per cron run (non-blocking)
    computeIndustryBenchmarks().catch((err) =>
      logger.warn("Benchmark computation failed", { error: String(err) })
    );

    return NextResponse.json({
      success: true,
      synced: successCount,
      total: organizations.length,
      results,
    });
  } catch (error) {
    logger.error("Cron sync error", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

async function storeComplianceSnapshot(orgId: string) {
  try {
    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    // Per-framework scores (shared helper — O(n) grouping)
    const frameworkScoreArray = calculateFrameworkScores(evidence);
    const frameworkScores: Record<string, { score: number; total: number; withEvidence: number }> =
      {};
    for (const { framework, score, total, withEvidence } of frameworkScoreArray) {
      frameworkScores[framework] = { score, total, withEvidence };
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

    logger.info(`Stored compliance snapshot for org ${orgId}: ${summary.score}%`);
  } catch (error) {
    logger.error(`Error storing compliance snapshot for org ${orgId}`, error);
    // Don't throw - snapshot storage failure shouldn't fail the sync
  }
}

/**
 * Gather weekly stats and dispatch digest emails to all org members.
 */
async function sendWeeklyDigestForOrg(orgId: string, repositoriesSynced: number) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Count new activity in last 7 days across all active repos
  const [newCommits, newPRs] = await Promise.all([
    db.commit.count({
      where: {
        repository: { orgId, isActive: true },
        committedAt: { gte: sevenDaysAgo },
      },
    }),
    db.pullRequest.count({
      where: {
        repository: { orgId, isActive: true },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  // Get latest compliance score from snapshots
  const latestSnapshot = await db.complianceSnapshot.findFirst({
    where: { orgId },
    orderBy: { snapshotDate: "desc" },
  });
  const complianceScore = latestSnapshot?.overallScore ?? 0;

  // Send to all org members
  const memberships = await db.orgMembership.findMany({
    where: { orgId },
    select: { userId: true },
  });

  await Promise.allSettled(
    memberships.map(({ userId }) =>
      sendWeeklyDigest(userId, orgId, {
        repositoriesSynced,
        newCommits,
        newPRs,
        complianceScore,
      })
    )
  );
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
