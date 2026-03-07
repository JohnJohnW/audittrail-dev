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
}

/**
 * Fetch and derive all data needed for the main dashboard page.
 * All individual queries fail gracefully — a partial load is better than a
 * full-page error.
 */
export async function getDashboardData(orgId: string): Promise<DashboardData> {
  let githubConnectionFetchFailed = false;

  const [githubConnection, repositories, subscription, recentExports, complianceSnapshots] =
    await Promise.all([
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

  // Find weakest framework from latest snapshot
  let weakestFramework: { name: string; score: number } | null = null;
  if (latestSnapshot?.frameworkScores) {
    const scores = latestSnapshot.frameworkScores as Record<
      string,
      { score: number; total: number; withEvidence: number }
    >;
    const sorted = Object.entries(scores).sort((a, b) => a[1].score - b[1].score);
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
  };
}
