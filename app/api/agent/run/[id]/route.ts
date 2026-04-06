/**
 * Agent Run Detail API
 *
 * GET: Get run status with all control assessments
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const { id } = await params;

    const run = await db.agentRun.findUnique({
      where: { id },
      include: { controlAssessments: true },
    });

    if (!run) {
      throw new AppError("Agent run not found", 404, "NOT_FOUND");
    }

    if (run.orgId !== orgId) {
      throw new AppError("Agent run not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({ run });
  } catch (error) {
    return handleApiError(error);
  }
}
