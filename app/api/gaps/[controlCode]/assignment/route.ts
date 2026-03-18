/**
 * Gap Assignment Detail API
 *
 * PATCH: update assignment
 * DELETE: remove assignment
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ controlCode: string }> }
) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = await params;
    const body = await request.json();
    const { frameworkName, status, notes, dueDate } = body;

    if (!frameworkName) {
      throw new AppError("frameworkName is required", 400, "MISSING_FIELDS");
    }

    const existing = await db.gapAssignment.findUnique({
      where: {
        orgId_controlCode_frameworkName: {
          orgId,
          controlCode,
          frameworkName,
        },
      },
    });

    if (!existing) {
      throw new AppError("Assignment not found", 404, "NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "resolved") updateData.resolvedAt = new Date();
    }
    if (notes !== undefined) updateData.notes = notes || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const assignment = await db.gapAssignment.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ controlCode: string }> }
) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = await params;
    const frameworkName = request.nextUrl.searchParams.get("frameworkName");

    if (!frameworkName) {
      throw new AppError("frameworkName query param is required", 400, "MISSING_FIELDS");
    }

    await db.gapAssignment.deleteMany({
      where: { orgId, controlCode, frameworkName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
