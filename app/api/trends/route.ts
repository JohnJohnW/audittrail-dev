import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);

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

    // Aggregate data by date
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateKey = date.toISOString().split("T")[0];

      // Commits for this day
      const dayCommits = await db.commit.count({
        where: {
          repoId: { in: repoIds },
          committedAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });
      commits.push(dayCommits);

      // Pull requests merged on this day
      const dayPRs = await db.pullRequest.count({
        where: {
          repoId: { in: repoIds },
          mergedAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });
      pullRequests.push(dayPRs);

      // Use stored snapshot if available, otherwise calculate
      const snapshot = snapshotMap.get(dateKey);
      if (snapshot) {
        complianceScores.push(snapshot.overallScore);
        evidenceCounts.push(
          snapshot.withEvidence + snapshot.partial + snapshot.limited
        );
      } else {
        // Fallback: estimate based on cumulative activity
        const allCommits = await db.commit.count({
          where: {
            repoId: { in: repoIds },
            committedAt: { lte: nextDate },
          },
        });
        const allPRs = await db.pullRequest.count({
          where: {
            repoId: { in: repoIds },
            mergedAt: { lte: nextDate },
          },
        });

        // Simplified compliance score (based on activity) - used as fallback
        const activityScore = Math.min(
          100,
          Math.round((allCommits + allPRs * 2) / 10)
        );
        complianceScores.push(activityScore);
        evidenceCounts.push(allCommits + allPRs);
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
