/**
 * Audit Cycle Detail API
 *
 * GET: get cycle with findings and requests
 * PATCH: update status/details (status transitions trigger snapshot/credential logic)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Pro subscription required", 403, "PRO_REQUIRED");
    }

    const { id } = await params;

    const cycle = await db.auditCycle.findFirst({
      where: { id, orgId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        findings: { orderBy: { createdAt: "desc" } },
        requests: {
          include: { assignee: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cycle) {
      throw new AppError("Audit cycle not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({ cycle });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Pro subscription required", 403, "PRO_REQUIRED");
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.auditCycle.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      throw new AppError("Audit cycle not found", 404, "NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;

      // Snapshot on entering fieldwork
      if (body.status === "fieldwork" && existing.status !== "fieldwork") {
        const snapshot = await db.complianceSnapshot.findFirst({
          where: { orgId },
          orderBy: { snapshotDate: "desc" },
          select: { id: true },
        });
        if (snapshot) updateData.evidenceSnapshotId = snapshot.id;
      }

      // Record close timestamp
      if (body.status === "closed") {
        updateData.closedAt = new Date();
      }
    }

    if (body.outcome) updateData.outcome = body.outcome;
    if (body.auditorName !== undefined) updateData.auditorName = body.auditorName || null;
    if (body.auditorFirm !== undefined) updateData.auditorFirm = body.auditorFirm || null;
    if (body.targetCloseDate !== undefined) {
      updateData.targetCloseDate = body.targetCloseDate ? new Date(body.targetCloseDate) : null;
    }

    const cycle = await db.auditCycle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ cycle });
  } catch (error) {
    return handleApiError(error);
  }
}
