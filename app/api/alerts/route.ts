import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/alerts
 * Returns unread count + recent alerts for the authenticated org.
 * Query params:
 *   resolved=false  - exclude resolved alerts (default: include all)
 *   type=score_drop - filter by alert type
 *   limit=50        - max results (capped at 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const { searchParams } = request.nextUrl;
    const resolvedParam = searchParams.get("resolved");
    const typeParam = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    const where = {
      orgId,
      ...(resolvedParam === "false" ? { resolvedAt: null } : {}),
      ...(typeParam ? { type: typeParam } : {}),
    };

    const [alerts, unreadCount] = await Promise.all([
      db.complianceAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.complianceAlert.count({
        where: { orgId, readAt: null, resolvedAt: null },
      }),
    ]);

    return NextResponse.json({ unreadCount, alerts });
  } catch (error) {
    return handleApiError(error);
  }
}
