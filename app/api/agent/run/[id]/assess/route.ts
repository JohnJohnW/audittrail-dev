/**
 * Agent Control Assessment API
 *
 * POST: Assess a single control within an agent run (async worker endpoint)
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { parseBodyWithSchema } from "@/lib/api";
import { db } from "@/lib/db";
import { z } from "zod";
import { startAgentRun } from "@/lib/agent/run-agent";
import { assessSingleControl } from "@/lib/agent/assess-control";
import type { ModelId } from "@/lib/agent/anthropic";

export const dynamic = "force-dynamic";

const AssessControlSchema = z.object({
  controlCode: z.string().min(1),
  frameworkName: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const { id: agentRunId } = await params;

    const body = await parseBodyWithSchema(request, AssessControlSchema);

    // Verify the run exists and belongs to the org
    const run = await db.agentRun.findUnique({
      where: { id: agentRunId },
    });

    if (!run) {
      throw new AppError("Agent run not found", 404, "NOT_FOUND");
    }

    if (run.orgId !== orgId) {
      throw new AppError("Agent run not found", 404, "NOT_FOUND");
    }

    // Only allow assessment on pending or running runs
    if (run.status !== "pending" && run.status !== "running") {
      throw new AppError(
        `Cannot assess controls on a run with status "${run.status}"`,
        400,
        "INVALID_RUN_STATUS"
      );
    }

    // Transition from pending to running if needed
    if (run.status === "pending") {
      await startAgentRun(agentRunId);
    }

    // Run the assessment - don't let individual control errors fail the whole run
    try {
      const assessment = await assessSingleControl({
        orgId,
        agentRunId,
        controlCode: body.controlCode,
        frameworkName: body.frameworkName,
        model: run.modelUsed as ModelId,
      });

      return NextResponse.json({ assessment });
    } catch (assessError) {
      // Return the error but don't fail the entire run
      return NextResponse.json(
        {
          error: assessError instanceof Error ? assessError.message : "Assessment failed",
          controlCode: body.controlCode,
          frameworkName: body.frameworkName,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
