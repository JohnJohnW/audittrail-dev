import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/alerts/[id]
 * Mark an alert as read or resolved.
 * Body: { action: "read" | "resolve" }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await requireAuth();
    const { id } = params;

    if (!id) throw new AppError("Missing alert id", 400, "INVALID_REQUEST");

    const { action } = (await request.json()) as { action?: string };
    if (action !== "read" && action !== "resolve") {
      throw new AppError('action must be "read" or "resolve"', 400, "INVALID_ACTION");
    }

    // Verify the alert belongs to this org
    const alert = await db.complianceAlert.findUnique({
      where: { id },
      select: { id: true, orgId: true },
    });

    if (!alert) throw new AppError("Alert not found", 404, "NOT_FOUND");
    if (alert.orgId !== orgId) throw new AppError("Not found", 404, "NOT_FOUND");

    const updated = await db.complianceAlert.update({
      where: { id },
      data: {
        ...(action === "read" ? { readAt: new Date() } : {}),
        ...(action === "resolve" ? { resolvedAt: new Date(), readAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
