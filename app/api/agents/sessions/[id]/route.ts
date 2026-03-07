import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { AGENT_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/sessions/[id] - Get session detail with full event timeline
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requireAuth();
    const { id } = params;

    const session = await db.agentSession.findFirst({
      where: { id, orgId },
      include: {
        events: {
          orderBy: { timestamp: "asc" },
          take: AGENT_CONFIG.MAX_EVENTS_PER_SESSION,
        },
      },
    });

    if (!session) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    // Compute risk breakdown by category
    const riskByCategory: Record<string, { count: number; maxRisk: string; totalScore: number }> =
      {};
    for (const event of session.events) {
      if (!riskByCategory[event.category]) {
        riskByCategory[event.category] = { count: 0, maxRisk: "low", totalScore: 0 };
      }
      riskByCategory[event.category].count++;
      riskByCategory[event.category].totalScore += event.riskScore;
      const riskOrder = ["low", "medium", "high", "critical"];
      if (
        riskOrder.indexOf(event.riskLevel) >
        riskOrder.indexOf(riskByCategory[event.category].maxRisk)
      ) {
        riskByCategory[event.category].maxRisk = event.riskLevel;
      }
    }

    // Collect unique control mappings across all events
    const controlSet = new Map<
      string,
      { frameworkName: string; controlCode: string; controlTitle: string; count: number }
    >();
    for (const event of session.events) {
      const mappings = event.controlMappings as Array<{
        frameworkName: string;
        controlCode: string;
        controlTitle: string;
      }> | null;
      if (mappings && Array.isArray(mappings)) {
        for (const m of mappings) {
          const key = `${m.frameworkName}:${m.controlCode}`;
          const existing = controlSet.get(key);
          if (existing) {
            existing.count++;
          } else {
            controlSet.set(key, { ...m, count: 1 });
          }
        }
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        externalId: session.externalId,
        agentFramework: session.agentFramework,
        agentId: session.agentId,
        status: session.status,
        riskLevel: session.riskLevel,
        riskScore: session.riskScore,
        summary: session.summary,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        metadata: session.metadata,
        eventCount: session.events.length,
      },
      events: session.events.map((e) => ({
        id: e.id,
        category: e.category,
        action: e.action,
        summary: e.summary,
        riskLevel: e.riskLevel,
        riskScore: e.riskScore,
        input: e.input,
        output: e.output,
        metadata: e.metadata,
        controlMappings: e.controlMappings,
        timestamp: e.timestamp,
      })),
      riskBreakdown: Object.entries(riskByCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
      complianceReferences: Array.from(controlSet.values()).sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
