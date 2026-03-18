/**
 * Audit Findings API
 *
 * GET: list findings for a cycle
 * POST: create a new finding
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

    const findings = await db.auditFinding.findMany({
      where: { auditCycleId: id, orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ findings });
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
    const {
      controlCode,
      frameworkName,
      severity,
      description,
      auditorNotes,
      remediationCommitment,
      remediationDueDate,
    } = body;

    if (!controlCode || !frameworkName || !severity || !description) {
      throw new AppError(
        "controlCode, frameworkName, severity, and description are required",
        400,
        "MISSING_FIELDS"
      );
    }

    // Verify cycle exists and belongs to org
    const cycle = await db.auditCycle.findFirst({ where: { id, orgId } });
    if (!cycle) {
      throw new AppError("Audit cycle not found", 404, "NOT_FOUND");
    }

    const finding = await db.auditFinding.create({
      data: {
        auditCycleId: id,
        orgId,
        controlCode,
        frameworkName,
        severity,
        description,
        auditorNotes: auditorNotes || null,
        remediationCommitment: remediationCommitment || null,
        remediationDueDate: remediationDueDate ? new Date(remediationDueDate) : null,
      },
    });

    return NextResponse.json({ finding }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
