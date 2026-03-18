/**
 * Audit Cycles API
 *
 * GET: list audit cycles
 * POST: create a new audit cycle
 * Pro-gated.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Audit management requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const cycles = await db.auditCycle.findMany({
      where: { orgId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { findings: true, requests: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cycles });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Audit management requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const body = await request.json();
    const {
      frameworkName,
      auditType,
      periodStart,
      periodEnd,
      auditorName,
      auditorFirm,
      targetCloseDate,
      status,
    } = body;

    if (!frameworkName || !auditType || !periodStart || !periodEnd) {
      throw new AppError(
        "frameworkName, auditType, periodStart, and periodEnd are required",
        400,
        "MISSING_FIELDS"
      );
    }

    // If starting in fieldwork, snapshot current compliance state
    let evidenceSnapshotId: string | null = null;
    if (status === "fieldwork") {
      const snapshot = await db.complianceSnapshot.findFirst({
        where: { orgId },
        orderBy: { snapshotDate: "desc" },
        select: { id: true },
      });
      evidenceSnapshotId = snapshot?.id ?? null;
    }

    const cycle = await db.auditCycle.create({
      data: {
        orgId,
        frameworkName,
        auditType,
        status: status || "planning",
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        auditorName: auditorName || null,
        auditorFirm: auditorFirm || null,
        targetCloseDate: targetCloseDate ? new Date(targetCloseDate) : null,
        evidenceSnapshotId,
        createdById: userId,
      },
    });

    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
