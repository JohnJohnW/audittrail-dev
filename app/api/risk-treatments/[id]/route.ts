/**
 * Risk Treatment Detail API
 *
 * PATCH: update treatment status/details
 * DELETE: soft-delete (set status to abandoned)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Pro subscription required", 403, "PRO_REQUIRED");
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.riskTreatment.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      throw new AppError("Treatment not found", 404, "NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.rationale) updateData.rationale = body.rationale;
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId || null;
    if (body.reviewDate !== undefined)
      updateData.reviewDate = body.reviewDate ? new Date(body.reviewDate) : null;
    if (body.linkedGithubIssue !== undefined)
      updateData.linkedGithubIssue = body.linkedGithubIssue || null;

    if (body.status === "closed") {
      updateData.closedAt = new Date();
    }

    const treatment = await db.riskTreatment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ treatment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Pro subscription required", 403, "PRO_REQUIRED");
    }

    const { id } = await params;

    const existing = await db.riskTreatment.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      throw new AppError("Treatment not found", 404, "NOT_FOUND");
    }

    // Soft delete
    await db.riskTreatment.update({
      where: { id },
      data: { status: "closed", closedAt: new Date(), closedByEvidence: "Abandoned by user" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
