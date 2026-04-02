import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requireAdminOrOwner, requireSubscription } from "@/lib/api";
import { db, isInTrial, canUseTrialAuditorSession } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/auditor/sessions
 * List all active auditor sessions for the org.
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await requireAuth();
    await requireSubscription(orgId, "pro");

    const sessions = await db.auditorSession.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        auditorEmail: true,
        auditorName: true,
        frameworkFilter: true,
        expiresAt: true,
        createdAt: true,
        lastActiveAt: true,
        token: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auditor/sessions
 * Create a new auditor session.
 * Body: { auditorEmail, auditorName?, frameworkFilter?, expiresInDays }
 * Requires admin or owner role.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireAdminOrOwner(ctx);
    const { orgId } = ctx;
    await requireSubscription(orgId, "pro");

    // Check trial auditor session limit (max 1 during trial)
    const inTrial = await isInTrial(orgId);
    if (inTrial) {
      const canCreate = await canUseTrialAuditorSession(orgId);
      if (!canCreate) {
        throw new AppError(
          "Trial auditor session limit reached (1 session). Upgrade to Pro for unlimited sessions.",
          403,
          "TRIAL_LIMIT_REACHED"
        );
      }
    }

    const body = (await request.json()) as {
      auditorEmail?: string;
      auditorName?: string;
      frameworkFilter?: string;
      expiresInDays?: number;
    };

    if (!body.auditorEmail) {
      throw new AppError("auditorEmail is required", 400, "INVALID_REQUEST");
    }

    const expiresInDays = body.expiresInDays ?? 30;
    if (expiresInDays < 1 || expiresInDays > 365) {
      throw new AppError("expiresInDays must be between 1 and 365", 400, "INVALID_REQUEST");
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const session = await db.auditorSession.create({
      data: {
        orgId,
        auditorEmail: body.auditorEmail,
        auditorName: body.auditorName ?? null,
        frameworkFilter: body.frameworkFilter ?? null,
        token,
        tokenHash,
        expiresAt,
      },
    });

    // Increment trial auditor session counter if in trial
    if (inTrial) {
      await db.subscription.update({
        where: { orgId },
        data: { trialAuditorSessionsUsed: { increment: 1 } },
      });
    }

    const origin = request.headers.get("origin") ?? "";
    const portalLink = `${origin}/auditor/${token}`;

    return NextResponse.json({ session, portalLink }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
