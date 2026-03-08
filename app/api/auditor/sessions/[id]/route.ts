import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/auditor/sessions/[id]
 * Revoke an auditor session.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requireAuth();
    const { id } = params;

    if (!id) throw new AppError("Missing session id", 400, "INVALID_REQUEST");

    const session = await db.auditorSession.findUnique({
      where: { id },
      select: { id: true, orgId: true },
    });

    if (!session) throw new AppError("Session not found", 404, "NOT_FOUND");
    if (session.orgId !== orgId) throw new AppError("Not found", 404, "NOT_FOUND");

    await db.auditorSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
