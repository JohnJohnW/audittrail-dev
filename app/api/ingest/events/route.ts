import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiKeyAuth } from "@/lib/api/api-key-auth";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AGENT_CONFIG, type AgentEventCategory } from "@/lib/constants";
import { assessEventRisk, assessSessionRisk } from "@/lib/agent-classifier";
import { getControlMappings } from "@/lib/agent-compliance";

export const dynamic = "force-dynamic";

interface IngestEvent {
  category: string;
  action: string;
  summary: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

interface IngestBody {
  sessionId: string;
  agentFramework?: string;
  agentId?: string;
  sessionStatus?: string;
  sessionSummary?: string;
  events: IngestEvent[];
}

/**
 * POST /api/ingest/events - Bulk event ingestion endpoint
 * Auth: API key (Bearer token)
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await requireApiKeyAuth(request);

    const body = (await request.json()) as IngestBody;

    // Validate body
    if (!body.sessionId || typeof body.sessionId !== "string") {
      throw new AppError("sessionId is required", 400, "INVALID_SESSION_ID");
    }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      throw new AppError("events array is required and must not be empty", 400, "INVALID_EVENTS");
    }

    if (body.events.length > AGENT_CONFIG.MAX_EVENTS_PER_BATCH) {
      throw new AppError(
        `Maximum ${AGENT_CONFIG.MAX_EVENTS_PER_BATCH} events per batch`,
        400,
        "BATCH_TOO_LARGE"
      );
    }

    // Validate event categories
    const validCategories = new Set<string>(AGENT_CONFIG.EVENT_CATEGORIES);
    for (const event of body.events) {
      if (!event.category || !validCategories.has(event.category)) {
        throw new AppError(
          `Invalid event category: ${event.category}. Valid: ${AGENT_CONFIG.EVENT_CATEGORIES.join(", ")}`,
          400,
          "INVALID_CATEGORY"
        );
      }
      if (!event.action || typeof event.action !== "string") {
        throw new AppError("Each event must have an action string", 400, "INVALID_ACTION");
      }
      if (!event.summary || typeof event.summary !== "string") {
        throw new AppError("Each event must have a summary string", 400, "INVALID_SUMMARY");
      }
    }

    // Upsert the session
    const session = await db.agentSession.upsert({
      where: {
        orgId_externalId: {
          orgId,
          externalId: body.sessionId,
        },
      },
      update: {
        status: body.sessionStatus || undefined,
        summary: body.sessionSummary || undefined,
        endedAt: body.sessionStatus === "completed" || body.sessionStatus === "failed"
          ? new Date()
          : undefined,
      },
      create: {
        orgId,
        externalId: body.sessionId,
        agentFramework: body.agentFramework || "openclaw",
        agentId: body.agentId || null,
        status: body.sessionStatus || "running",
        summary: body.sessionSummary || null,
      },
    });

    // Classify, score, and map each event
    const enrichedEvents = body.events.map((event) => {
      const category = event.category as AgentEventCategory;
      const risk = assessEventRisk(
        category,
        event.action,
        event.input,
        event.output,
        event.metadata
      );
      const controlMappings = getControlMappings(category, risk.riskLevel);

      return {
        sessionId: session.id,
        orgId,
        category: event.category,
        action: event.action,
        summary: event.summary.slice(0, 1000),
        riskLevel: risk.riskLevel,
        riskScore: risk.riskScore,
        input: event.input
          ? (truncateJson(event.input) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        output: event.output
          ? (truncateJson(event.output) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        metadata: event.metadata
          ? (event.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        controlMappings: controlMappings.length > 0
          ? (controlMappings as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      };
    });

    // Batch insert events
    const result = await db.agentEvent.createMany({
      data: enrichedEvents,
    });

    // Update session risk score based on all events
    const allSessionEvents = await db.agentEvent.findMany({
      where: { sessionId: session.id },
      select: { riskScore: true, riskLevel: true },
    });

    const sessionRisk = assessSessionRisk(
      allSessionEvents.map((e) => ({
        riskScore: e.riskScore,
        riskLevel: e.riskLevel as "low" | "medium" | "high" | "critical",
      }))
    );

    await db.agentSession.update({
      where: { id: session.id },
      data: {
        riskScore: sessionRisk.riskScore,
        riskLevel: sessionRisk.riskLevel,
      },
    });

    logger.info("Events ingested", {
      orgId,
      sessionId: session.id,
      eventCount: result.count,
      riskLevel: sessionRisk.riskLevel,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      eventsIngested: result.count,
      sessionRisk: sessionRisk.riskLevel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Truncate JSON to prevent storing excessively large payloads.
 */
function truncateJson(obj: Record<string, unknown>, maxLength = 5000): Record<string, unknown> {
  const str = JSON.stringify(obj);
  if (str.length <= maxLength) return obj;

  // Return a truncated version
  try {
    const truncated = JSON.parse(str.slice(0, maxLength - 50));
    return { ...truncated, _truncated: true };
  } catch {
    return { _truncated: true, _originalLength: str.length };
  }
}
