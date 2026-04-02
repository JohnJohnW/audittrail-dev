import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/** Validates token, checks expiry, updates lastActiveAt. Returns the session. */
async function validateAuditorToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await db.auditorSession.findFirst({
    where: { tokenHash },
    select: {
      id: true,
      orgId: true,
      auditorEmail: true,
      auditorName: true,
      frameworkFilter: true,
      expiresAt: true,
    },
  });

  if (!session) throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  if (session.expiresAt < new Date()) throw new AppError("Token has expired", 401, "UNAUTHORIZED");

  // Update lastActiveAt non-blocking
  db.auditorSession
    .update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => {
      /* non-critical */
    });

  return session;
}

/**
 * GET /api/auditor/[token]/evidence
 * Token-gated. Returns full evidence filtered by session's frameworkFilter.
 * No login required.
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await validateAuditorToken(params.token);

    const evidence = await getComplianceEvidence(session.orgId);

    // Apply framework filter if set on the session
    const controls = session.frameworkFilter
      ? evidence.controls.filter((c) => c.frameworkName === session.frameworkFilter)
      : evidence.controls;

    // Fetch sign-offs for this session
    const signoffs = await db.controlSignoff.findMany({
      where: { sessionId: session.id },
      select: {
        controlCode: true,
        frameworkName: true,
        verdict: true,
        note: true,
        signedAt: true,
      },
    });

    const signoffMap = new Map(signoffs.map((s) => [`${s.controlCode}::${s.frameworkName}`, s]));

    // Attach signoff to each control
    const controlsWithSignoff = controls.map((c) => ({
      ...c,
      signoff: signoffMap.get(`${c.controlCode}::${c.frameworkName}`) ?? null,
    }));

    // Fetch comment counts per control
    const commentCounts = await db.auditorComment.groupBy({
      by: ["controlCode", "frameworkName"],
      where: { sessionId: session.id },
      _count: { id: true },
    });

    const commentMap = new Map(
      commentCounts.map((c) => [`${c.controlCode}::${c.frameworkName}`, c._count.id])
    );

    const controlsWithMeta = controlsWithSignoff.map((c) => ({
      ...c,
      commentCount: commentMap.get(`${c.controlCode}::${c.frameworkName}`) ?? 0,
    }));

    const summary = getEvidenceSummary(controls);

    return NextResponse.json({
      session: {
        id: session.id,
        auditorEmail: session.auditorEmail,
        auditorName: session.auditorName,
        frameworkFilter: session.frameworkFilter,
        expiresAt: session.expiresAt,
      },
      summary,
      controls: controlsWithMeta,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
