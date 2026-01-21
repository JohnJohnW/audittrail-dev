import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format, subDays, startOfDay } from "date-fns";
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

    // Aggregate data by date
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

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

      // For compliance score and evidence, we'll use a simplified calculation
      // In production, you'd want to store daily snapshots
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

      // Simplified compliance score (based on activity)
      const activityScore = Math.min(
        100,
        Math.round((allCommits + allPRs * 2) / 10)
      );
      complianceScores.push(activityScore);
      evidenceCounts.push(allCommits + allPRs);
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
