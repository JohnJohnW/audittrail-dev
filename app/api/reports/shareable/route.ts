import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

// GET: list shareable report links for the org
export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const reports = await db.shareableReport.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, title: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: create a new shareable report link (Pro only)
export async function POST() {
  try {
    const { orgId } = await requireAuth();

    // Pro-only: check subscription
    const subscription = await db.subscription.findUnique({ where: { orgId } });
    if (!subscription || subscription.plan !== "pro") {
      return NextResponse.json(
        { error: "Shareable reports are a Pro feature. Upgrade to share your compliance report." },
        { status: 403 }
      );
    }

    // Expire any old tokens (keep only the 3 most recent)
    const existing = await db.shareableReport.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing.length >= 3) {
      const toDelete = existing.slice(2).map((r) => r.id);
      await db.shareableReport.deleteMany({ where: { id: { in: toDelete } } });
    }

    const report = await db.shareableReport.create({
      data: { orgId, title: "Compliance Report" },
    });

    return NextResponse.json({ report });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: revoke a shareable report link
export async function DELETE(request: Request) {
  try {
    const { orgId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing report id" }, { status: 400 });
    }

    // Verify ownership before deleting
    const report = await db.shareableReport.findFirst({ where: { id, orgId } });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.shareableReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
