import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay } from "date-fns";
import { handleApiError } from "@/lib/error-handler";
import { clamp } from "@/lib/utils";

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
    const daysParam = searchParams.get("days");
    
    // Validate and clamp days parameter (1-365)
    let days = 30; // default
    if (daysParam !== null) {
      const parsed = parseInt(daysParam, 10);
      if (isNaN(parsed)) {
        return NextResponse.json({ error: "days must be a number" }, { status: 400 });
      }
      days = clamp(parsed, 1, 365);
    }

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

    // Batch query: Get all commits grouped by date using raw SQL for efficiency
    const commitsByDate = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(committed_at) as date, COUNT(*)::bigint as count
      FROM commits
      WHERE repo_id = ANY(${repoIds})
        AND committed_at >= ${startDate}
      GROUP BY DATE(committed_at)
      ORDER BY date
    `;
    
    // Batch query: Get all PRs grouped by date
    const prsByDate = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(merged_at) as date, COUNT(*)::bigint as count
      FROM pull_requests
      WHERE repo_id = ANY(${repoIds})
        AND merged_at >= ${startDate}
        AND merged_at IS NOT NULL
      GROUP BY DATE(merged_at)
      ORDER BY date
    `;

    // Convert to Maps for O(1) lookup
    const commitsMap = new Map(
      commitsByDate.map((r) => [r.date.toString().split("T")[0], Number(r.count)])
    );
    const prsMap = new Map(
      prsByDate.map((r) => [r.date.toString().split("T")[0], Number(r.count)])
    );

    // Get total cumulative counts for fallback calculation (single query each)
    const totalCommits = repoIds.length > 0 ? await db.commit.count({
      where: { repoId: { in: repoIds } },
    }) : 0;
    const totalPRs = repoIds.length > 0 ? await db.pullRequest.count({
      where: { repoId: { in: repoIds }, mergedAt: { not: null } },
    }) : 0;

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
        evidenceCounts.push(
          snapshot.withEvidence + snapshot.partial + snapshot.limited
        );
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
