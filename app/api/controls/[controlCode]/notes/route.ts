import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

type Params = { params: { controlCode: string } };

/**
 * GET /api/controls/[controlCode]/notes?framework=ISO+27001
 * Returns the org's note for this control + framework.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;
    const frameworkName = request.nextUrl.searchParams.get("framework");

    if (!frameworkName)
      throw new AppError("framework query param required", 400, "INVALID_REQUEST");

    const note = await db.controlNote.findUnique({
      where: { orgId_controlCode_frameworkName: { orgId, controlCode, frameworkName } },
      select: { id: true, content: true, updatedAt: true, author: { select: { name: true } } },
    });

    return NextResponse.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/controls/[controlCode]/notes
 * Upsert a note for this control.
 * Body: { content: string, frameworkName: string }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { orgId, userId } = await requireAuth();
    const { controlCode } = params;

    const body = (await request.json()) as { content?: string; frameworkName?: string };
    if (!body.content?.trim()) throw new AppError("content is required", 400, "INVALID_REQUEST");
    if (!body.frameworkName)
      throw new AppError("frameworkName is required", 400, "INVALID_REQUEST");

    const note = await db.controlNote.upsert({
      where: {
        orgId_controlCode_frameworkName: {
          orgId,
          controlCode,
          frameworkName: body.frameworkName,
        },
      },
      update: { content: body.content.trim(), authorId: userId },
      create: {
        orgId,
        controlCode,
        frameworkName: body.frameworkName,
        content: body.content.trim(),
        authorId: userId,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/controls/[controlCode]/notes?framework=ISO+27001
 * Remove the note for this control.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;
    const frameworkName = request.nextUrl.searchParams.get("framework");

    if (!frameworkName)
      throw new AppError("framework query param required", 400, "INVALID_REQUEST");

    await db.controlNote.deleteMany({
      where: { orgId, controlCode, frameworkName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
