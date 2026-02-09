import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/summary - Aggregate agent stats for the organization
 */
export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const [
      totalSessions,
      activeSessions,
      totalEvents,
      riskDistribution,
      recentSessions,
      categoryBreakdown,
    ] = await Promise.all([
      db.agentSession.count({ where: { orgId } }),
      db.agentSession.count({ where: { orgId, status: "running" } }),
      db.agentEvent.count({ where: { orgId } }),
      db.agentSession.groupBy({
        by: ["riskLevel"],
        where: { orgId },
        _count: true,
      }),
      db.agentSession.findMany({
        where: { orgId },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          _count: { select: { events: true } },
        },
      }),
      db.agentEvent.groupBy({
        by: ["category"],
        where: { orgId },
        _count: true,
      }),
    ]);

    const riskMap: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const r of riskDistribution) {
      riskMap[r.riskLevel] = r._count;
    }

    return NextResponse.json({
      totalSessions,
      activeSessions,
      totalEvents,
      riskDistribution: riskMap,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count,
      })),
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        externalId: s.externalId,
        agentFramework: s.agentFramework,
        status: s.status,
        riskLevel: s.riskLevel,
        startedAt: s.startedAt,
        eventCount: s._count.events,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
