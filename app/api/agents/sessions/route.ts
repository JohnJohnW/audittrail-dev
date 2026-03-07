import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { AGENT_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/sessions - List agent sessions for the organization
 * Query params: page, limit, riskLevel, status, framework
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      AGENT_CONFIG.MAX_SESSIONS_PER_PAGE,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const riskLevel = searchParams.get("riskLevel");
    const status = searchParams.get("status");
    const framework = searchParams.get("framework");

    const where: Record<string, unknown> = { orgId };
    if (riskLevel) where.riskLevel = riskLevel;
    if (status) where.status = status;
    if (framework) where.agentFramework = framework;

    const [sessions, total] = await Promise.all([
      db.agentSession.findMany({
        where,
        include: {
          _count: {
            select: { events: true },
          },
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.agentSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        externalId: s.externalId,
        agentFramework: s.agentFramework,
        agentId: s.agentId,
        status: s.status,
        riskLevel: s.riskLevel,
        riskScore: s.riskScore,
        summary: s.summary,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        eventCount: s._count.events,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
