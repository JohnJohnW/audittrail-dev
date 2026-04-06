/**
 * Agent Run API
 *
 * POST: Create a new agent run
 * GET: List agent runs for the authenticated org
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { parseBodyWithSchema } from "@/lib/api";
import { db } from "@/lib/db";
import { z } from "zod";
import { canRunAgent, createAgentRun } from "@/lib/agent/run-agent";
import { MODELS, type ModelId } from "@/lib/agent/anthropic";

export const dynamic = "force-dynamic";

const CreateRunSchema = z.object({
  frameworks: z.array(z.string()).optional(),
  controlCodes: z.array(z.string()).optional(),
  model: z.enum([MODELS.OPUS, MODELS.SONNET]).optional().default(MODELS.OPUS),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Check if the org is allowed to run the agent
    const eligibility = await canRunAgent(orgId);
    if (!eligibility.allowed) {
      throw new AppError(eligibility.reason ?? "Agent run not allowed", 403, "AGENT_RUN_LIMIT", {
        remaining: eligibility.remaining,
      });
    }

    const body = await parseBodyWithSchema(request, CreateRunSchema);

    const result = await createAgentRun({
      orgId,
      frameworks: body.frameworks,
      controlCodes: body.controlCodes,
      model: body.model as ModelId,
      triggeredBy: "user",
      triggerEvent: "manual",
    });

    return NextResponse.json(
      {
        agentRunId: result.agentRunId,
        controls: result.controls,
        totalControls: result.totalControls,
        model: result.model,
        estimatedCostCents: result.estimatedCostCents,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const runs = await db.agentRun.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    return handleApiError(error);
  }
}
