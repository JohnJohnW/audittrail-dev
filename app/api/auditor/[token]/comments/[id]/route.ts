import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/auditor/[token]/comments/[id]
 * Resolve a comment. Only org members (authenticated users) can resolve.
 * Body: { status: "resolved" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string; id: string } }
) {
  try {
    // This endpoint requires org auth (not just auditor token) to resolve
    const { orgId } = await requireAuth();

    // Validate the token belongs to this org
    const session = await db.auditorSession.findUnique({
      where: { token: params.token },
      select: { id: true, orgId: true },
    });
    if (!session || session.orgId !== orgId) {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    const comment = await db.auditorComment.findUnique({
      where: { id: params.id },
      select: { id: true, sessionId: true, orgId: true },
    });

    if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
    if (comment.sessionId !== session.id || comment.orgId !== orgId) {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    const body = (await request.json()) as { status?: string };
    if (body.status !== "resolved") {
      throw new AppError('status must be "resolved"', 400, "INVALID_REQUEST");
    }

    const updated = await db.auditorComment.update({
      where: { id: params.id },
      data: { status: "resolved" },
    });

    return NextResponse.json({ comment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
