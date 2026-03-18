/**
 * Auditor Request Detail API
 *
 * PATCH: update request status/assignment
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { orgId } = await requireAuth();
    const { requestId } = await params;

    const existing = await db.auditorRequest.findFirst({
      where: { id: requestId, orgId },
    });

    if (!existing) {
      throw new AppError("Request not found", 404, "NOT_FOUND");
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "resolved") updateData.resolvedAt = new Date();
    }
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
    if (body.dueDate !== undefined)
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const auditorRequest = await db.auditorRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    return NextResponse.json({ request: auditorRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
