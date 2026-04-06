/**
 * Human Task Detail API
 *
 * PATCH: Update a human task (status, assignment, evidence, completion)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, parseBodyWithSchema } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateTaskSchema = z.object({
  status: z.enum(["pending", "in_progress", "complete", "overdue"]).optional(),
  assignedToId: z.string().nullable().optional(),
  evidenceUrl: z.string().url().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const { id } = await params;

    const body = await parseBodyWithSchema(request, UpdateTaskSchema);

    // Verify the task exists and belongs to this org
    const existing = await db.humanTask.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;

      // Auto-set completedAt when marking as complete
      if (body.status === "complete" && !body.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    if (body.assignedToId !== undefined) {
      updateData.assignedToId = body.assignedToId;
    }

    if (body.evidenceUrl !== undefined) {
      updateData.evidenceUrl = body.evidenceUrl;
    }

    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    const task = await db.humanTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}
