/**
 * Gap Assignment API
 *
 * POST: assign a gap to a user
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ controlCode: string }> }
) {
  try {
    const { orgId, userId } = await requireAuth();
    const { controlCode } = await params;
    const body = await request.json();
    const { frameworkName, assigneeId, dueDate, notes } = body;

    if (!frameworkName || !assigneeId) {
      throw new AppError("frameworkName and assigneeId are required", 400, "MISSING_FIELDS");
    }

    const assignment = await db.gapAssignment.upsert({
      where: {
        orgId_controlCode_frameworkName: {
          orgId,
          controlCode,
          frameworkName,
        },
      },
      update: {
        assigneeId,
        assignedById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "open",
        resolvedAt: null,
      },
      create: {
        orgId,
        controlCode,
        frameworkName,
        assigneeId,
        assignedById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
