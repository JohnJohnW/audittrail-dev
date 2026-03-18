/**
 * Audit Finding Detail API
 *
 * PATCH: update finding status/details
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { orgId } = await requireAuth();
    const { findingId } = await params;

    const existing = await db.auditFinding.findFirst({
      where: { id: findingId, orgId },
    });

    if (!existing) {
      throw new AppError("Finding not found", 404, "NOT_FOUND");
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status) updateData.status = body.status;
    if (body.auditorNotes !== undefined) updateData.auditorNotes = body.auditorNotes || null;
    if (body.remediationCommitment !== undefined)
      updateData.remediationCommitment = body.remediationCommitment || null;
    if (body.remediationDueDate !== undefined) {
      updateData.remediationDueDate = body.remediationDueDate
        ? new Date(body.remediationDueDate)
        : null;
    }

    const finding = await db.auditFinding.update({
      where: { id: findingId },
      data: updateData,
    });

    return NextResponse.json({ finding });
  } catch (error) {
    return handleApiError(error);
  }
}
