import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getNumericQueryParam } from "@/lib/api";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";
import { handleApiError } from "@/lib/error-handler";
import { TRENDS_CONFIG } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Validate and clamp days parameter using helper
    const days = getNumericQueryParam(request.nextUrl, "days", {
      defaultValue: TRENDS_CONFIG.DEFAULT_DAYS,
      min: TRENDS_CONFIG.MIN_DAYS,
      max: TRENDS_CONFIG.MAX_DAYS,
    });

    const startDate = startOfDay(subDays(new Date(), days));
    const dates: string[] = [];
    const commits: number[] = [];
    const pullRequests: number[] = [];
    const complianceScores: number[] = [];
    const evidenceCounts: number[] = [];

    // Generate date range
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - i - 1);
      dates.push(date.toISOString());
    }

    // Get repositories
    const repositories = await db.repository.findMany({
      where: { orgId, isActive: true },
    });

    const repoIds = repositories.map((r) => r.id);

    // Early return if no repositories
    if (repoIds.length === 0) {
      // Return empty data for all dates
      for (let i = 0; i < days; i++) {
        commits.push(0);
        pullRequests.push(0);
        complianceScores.push(0);
        evidenceCounts.push(0);
      }
      return NextResponse.json({
        dates,
        commits,
        pullRequests,
        complianceScores,
        evidenceCounts,
      });
    }

    // Get stored compliance snapshots for the date range
    const snapshots = await db.complianceSnapshot.findMany({
      where: {
        orgId,
        snapshotDate: { gte: startDate },
      },
      orderBy: { snapshotDate: "asc" },
    });

    // Create a map of date -> snapshot for quick lookup
    const snapshotMap = new Map(
      snapshots.map((s) => [s.snapshotDate.toISOString().split("T")[0], s])
    );

    // Get commits grouped by date using Prisma (only fetch date field for efficiency)
    const allCommits = await db.commit.findMany({
      where: {
        repoId: { in: repoIds },
        committedAt: { gte: startDate },
      },
      select: { committedAt: true },
    });

    // Get PRs grouped by date using Prisma (only fetch date field for efficiency)
    const allPRs = await db.pullRequest.findMany({
      where: {
        repoId: { in: repoIds },
        mergedAt: { gte: startDate, not: null },
      },
      select: { mergedAt: true },
    });

    // Group commits by date
    const commitsMap = new Map<string, number>();
    for (const commit of allCommits) {
      if (commit.committedAt) {
        const dateKey = commit.committedAt.toISOString().split("T")[0];
        commitsMap.set(dateKey, (commitsMap.get(dateKey) || 0) + 1);
      }
    }

    // Group PRs by date
    const prsMap = new Map<string, number>();
    for (const pr of allPRs) {
      if (pr.mergedAt) {
        const dateKey = pr.mergedAt.toISOString().split("T")[0];
        prsMap.set(dateKey, (prsMap.get(dateKey) || 0) + 1);
      }
    }

    // Get total cumulative counts for fallback calculation (single query each)
    const totalCommits = await db.commit.count({
      where: { repoId: { in: repoIds } },
    });
    const totalPRs = await db.pullRequest.count({
      where: { repoId: { in: repoIds }, mergedAt: { not: null } },
    });

    // Aggregate data by date using pre-fetched data
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const dateKey = date.toISOString().split("T")[0];

      // Get from maps (O(1) lookup instead of N queries)
      commits.push(commitsMap.get(dateKey) || 0);
      pullRequests.push(prsMap.get(dateKey) || 0);

      // Use stored snapshot if available, otherwise use fallback
      const snapshot = snapshotMap.get(dateKey);
      if (snapshot) {
        complianceScores.push(snapshot.overallScore);
        evidenceCounts.push(snapshot.withEvidence + snapshot.partial + snapshot.limited);
      } else {
        // Fallback: simple estimate based on total activity
        const activityScore = Math.min(100, Math.round((totalCommits + totalPRs * 2) / 10));
        complianceScores.push(activityScore);
        evidenceCounts.push(totalCommits + totalPRs);
      }
    }

    return NextResponse.json({
      dates,
      commits,
      pullRequests,
      complianceScores,
      evidenceCounts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
