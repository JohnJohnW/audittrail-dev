/**
 * Auditor Requests API
 *
 * GET: list requests for a cycle
 * POST: create a new request
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
    const { id } = await params;

    const requests = await db.auditorRequest.findMany({
      where: { auditCycleId: id, orgId },
      include: { assignee: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Pro subscription required", 403, "PRO_REQUIRED");
    }

    const { id } = await params;
    const body = await request.json();
    const { controlCode, frameworkName, requestText, assigneeId, dueDate } = body;

    if (!requestText) {
      throw new AppError("requestText is required", 400, "MISSING_FIELDS");
    }

    const cycle = await db.auditCycle.findFirst({ where: { id, orgId } });
    if (!cycle) {
      throw new AppError("Audit cycle not found", 404, "NOT_FOUND");
    }

    const auditorRequest = await db.auditorRequest.create({
      data: {
        auditCycleId: id,
        orgId,
        controlCode: controlCode || null,
        frameworkName: frameworkName || null,
        requestText,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ request: auditorRequest }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
