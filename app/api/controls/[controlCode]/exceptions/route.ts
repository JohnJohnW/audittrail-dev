import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

type Params = { params: { controlCode: string } };

/**
 * GET /api/controls/[controlCode]/exceptions?framework=ISO+27001
 * Returns the org's exception for this control + framework (if any).
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;
    const frameworkName = request.nextUrl.searchParams.get("framework");

    if (!frameworkName)
      throw new AppError("framework query param required", 400, "INVALID_REQUEST");

    const exception = await db.evidenceException.findUnique({
      where: { orgId_controlCode_frameworkName: { orgId, controlCode, frameworkName } },
      select: { id: true, reason: true, expiresAt: true, createdAt: true },
    });

    // Check if exception is still active (not expired)
    const isActive = exception ? !exception.expiresAt || exception.expiresAt > new Date() : false;

    return NextResponse.json({ exception, isActive });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/controls/[controlCode]/exceptions
 * Upsert an evidence exception for this control.
 * Body: { reason: string, frameworkName: string, expiresAt?: string (ISO date) }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { orgId, userId } = await requireAuth();
    const { controlCode } = params;

    const body = (await request.json()) as {
      reason?: string;
      frameworkName?: string;
      expiresAt?: string;
    };

    if (!body.reason?.trim()) throw new AppError("reason is required", 400, "INVALID_REQUEST");
    if (!body.frameworkName)
      throw new AppError("frameworkName is required", 400, "INVALID_REQUEST");

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const exception = await db.evidenceException.upsert({
      where: {
        orgId_controlCode_frameworkName: {
          orgId,
          controlCode,
          frameworkName: body.frameworkName,
        },
      },
      update: {
        reason: body.reason.trim(),
        expiresAt,
        createdBy: userId,
      },
      create: {
        orgId,
        controlCode,
        frameworkName: body.frameworkName,
        reason: body.reason.trim(),
        expiresAt,
        createdBy: userId,
      },
    });

    return NextResponse.json({ exception });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/controls/[controlCode]/exceptions?framework=ISO+27001
 * Remove the exception for this control.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;
    const frameworkName = request.nextUrl.searchParams.get("framework");

    if (!frameworkName)
      throw new AppError("framework query param required", 400, "INVALID_REQUEST");

    await db.evidenceException.deleteMany({
      where: { orgId, controlCode, frameworkName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
