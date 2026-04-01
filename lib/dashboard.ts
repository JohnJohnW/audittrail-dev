/**
 * Dashboard Data Layer
 *
 * Centralises all database queries needed to render the main dashboard page.
 * Keeps page.tsx focused on auth, rendering, and layout concerns.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export type RepositoryWithCount = Prisma.RepositoryGetPayload<{
  include: { _count: { select: { commits: true; pullRequests: true } } };
}>;

export interface DashboardData {
  githubConnection: Awaited<ReturnType<typeof db.gitHubConnection.findUnique>>;
  githubConnectionFetchFailed: boolean;
  repositories: RepositoryWithCount[];
  subscription: Awaited<ReturnType<typeof db.subscription.findUnique>>;
  recentExports: Awaited<ReturnType<typeof db.export.findMany>>;
  totalCommits: number;
  totalPRs: number;
  complianceScore: number | null;
  scoreDelta: number | null;
  weakestFramework: { name: string; score: number } | null;
  lastSyncedAt: Date | null;
  remediationVelocity: { controlsFixed: number; avgDaysToFix: number | null } | null;
}

/**
 * Fetch and derive all data needed for the main dashboard page.
 * All individual queries fail gracefully - a partial load is better than a
 * full-page error.
 */
export async function getDashboardData(orgId: string): Promise<DashboardData> {
  let githubConnectionFetchFailed = false;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    githubConnection,
    repositories,
    subscription,
    recentExports,
    complianceSnapshots,
    remediationEvents,
  ] = await Promise.all([
    db.gitHubConnection.findUnique({ where: { orgId } }).catch((err) => {
      logger.error("Failed to fetch GitHub connection", err);
      githubConnectionFetchFailed = true;
      return null;
    }),
    db.repository
      .findMany({
        where: { orgId, isActive: true },
        include: {
          _count: {
            select: {
              commits: true,
              pullRequests: true,
            },
          },
        },
      })
      .catch(() => [] as RepositoryWithCount[]),
    db.subscription.findUnique({ where: { orgId } }).catch(() => null),
    db.export
      .findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      .catch(() => [] as Awaited<ReturnType<typeof db.export.findMany>>),
    db.complianceSnapshot
      .findMany({
        where: { orgId },
        orderBy: { snapshotDate: "desc" },
        take: 2,
      })
      .catch(() => [] as Awaited<ReturnType<typeof db.complianceSnapshot.findMany>>),
    db.remediationEvent
      .findMany({
        where: { orgId, detectedAt: { gte: thirtyDaysAgo } },
        select: { controlCode: true, frameworkName: true, daysToFix: true },
      })
      .catch(
        () => [] as { controlCode: string; frameworkName: string; daysToFix: number | null }[]
      ),
  ]);

  // Derived metrics
  const totalCommits = repositories.reduce((sum, r) => sum + r._count.commits, 0);
  const totalPRs = repositories.reduce((sum, r) => sum + r._count.pullRequests, 0);

  const latestSnapshot = complianceSnapshots[0] ?? null;
  const previousSnapshot = complianceSnapshots[1] ?? null;
  const complianceScore = latestSnapshot?.overallScore ?? null;
  const scoreDelta =
    latestSnapshot && previousSnapshot
      ? latestSnapshot.overallScore - previousSnapshot.overallScore
      : null;

  // Fetch active framework names to guard against stale snapshot data
  const activeFrameworks = await db.complianceFramework
    .findMany({ select: { name: true } })
    .catch(() => [] as { name: string }[]);
  const activeFrameworkNames = new Set(activeFrameworks.map((f) => f.name));

  // Find weakest framework from latest snapshot (active frameworks only)
  let weakestFramework: { name: string; score: number } | null = null;
  if (latestSnapshot?.frameworkScores) {
    const scores = latestSnapshot.frameworkScores as Record<
      string,
      { score: number; total: number; withEvidence: number }
    >;
    const sorted = Object.entries(scores)
      .filter(([name]) => activeFrameworkNames.size === 0 || activeFrameworkNames.has(name))
      .sort((a, b) => a[1].score - b[1].score);
    if (sorted.length > 0) {
      weakestFramework = { name: sorted[0][0], score: sorted[0][1].score };
    }
  }

  // Latest sync time across all active repos
  const lastSyncedAt = repositories.reduce(
    (latest: Date | null, r) => {
      if (!r.lastSyncedAt) return latest;
      if (!latest) return r.lastSyncedAt;
      return r.lastSyncedAt > latest ? r.lastSyncedAt : latest;
    },
    null as Date | null
  );

  // Remediation velocity - only populated once we have at least one event
  let remediationVelocity: DashboardData["remediationVelocity"] = null;
  if (remediationEvents.length > 0) {
    // Count distinct controls fixed (de-duplicate same control fixed multiple times in window)
    const fixedKeys = new Set(remediationEvents.map((e) => `${e.controlCode}|${e.frameworkName}`));
    const controlsFixed = fixedKeys.size;
    const withDays = remediationEvents.filter((e) => e.daysToFix !== null);
    const avgDaysToFix =
      withDays.length > 0
        ? Math.round(withDays.reduce((s, e) => s + (e.daysToFix ?? 0), 0) / withDays.length)
        : null;
    remediationVelocity = { controlsFixed, avgDaysToFix };
  }

  return {
    githubConnection,
    githubConnectionFetchFailed,
    repositories,
    subscription,
    recentExports,
    totalCommits,
    totalPRs,
    complianceScore,
    scoreDelta,
    weakestFramework,
    lastSyncedAt,
    remediationVelocity,
  };
}
