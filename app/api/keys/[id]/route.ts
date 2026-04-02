import { NextResponse } from "next/server";
import { requireAuth, requireAdminOrOwner } from "@/lib/api/auth";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/keys/[id] - Revoke an API key
 * Requires admin or owner role.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    requireAdminOrOwner(ctx);
    const { orgId } = ctx;
    const { id } = params;

    const apiKey = await db.apiKey.findFirst({
      where: { id, orgId },
    });

    if (!apiKey) {
      throw new AppError("API key not found", 404, "KEY_NOT_FOUND");
    }

    if (apiKey.revokedAt) {
      throw new AppError("API key is already revoked", 400, "KEY_ALREADY_REVOKED");
    }

    await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
