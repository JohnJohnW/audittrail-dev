/**
 * My Gap Assignments API
 *
 * GET: gaps assigned to current user
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId, userId } = await requireAuth();

    const assignments = await db.gapAssignment.findMany({
      where: { orgId, assigneeId: userId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return handleApiError(error);
  }
}
