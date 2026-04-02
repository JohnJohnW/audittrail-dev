import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

async function getValidSession(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await db.auditorSession.findFirst({
    where: { tokenHash },
    select: { id: true, orgId: true, expiresAt: true },
  });
  if (!session) throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  if (session.expiresAt < new Date()) throw new AppError("Token has expired", 401, "UNAUTHORIZED");
  return session;
}

/**
 * GET /api/auditor/[token]/signoffs
 * List all sign-offs for this session.
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getValidSession(params.token);

    const signoffs = await db.controlSignoff.findMany({
      where: { sessionId: session.id },
      orderBy: { signedAt: "desc" },
    });

    return NextResponse.json({ signoffs });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auditor/[token]/signoffs
 * Create or update a sign-off on a control.
 * Body: { controlCode, frameworkName, verdict, note? }
 * verdict: "approved" | "needs_more_info" | "rejected"
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getValidSession(params.token);

    const body = (await request.json()) as {
      controlCode?: string;
      frameworkName?: string;
      verdict?: string;
      note?: string;
    };

    const VALID_VERDICTS = ["approved", "needs_more_info", "rejected"];
    if (!body.controlCode || !body.frameworkName || !body.verdict) {
      throw new AppError(
        "controlCode, frameworkName, and verdict are required",
        400,
        "INVALID_REQUEST"
      );
    }
    if (!VALID_VERDICTS.includes(body.verdict)) {
      throw new AppError(
        `verdict must be one of: ${VALID_VERDICTS.join(", ")}`,
        400,
        "INVALID_REQUEST"
      );
    }

    // Upsert - unique on (sessionId, controlCode, frameworkName)
    const signoff = await db.controlSignoff.upsert({
      where: {
        sessionId_controlCode_frameworkName: {
          sessionId: session.id,
          controlCode: body.controlCode,
          frameworkName: body.frameworkName,
        },
      },
      update: {
        verdict: body.verdict,
        note: body.note ?? null,
        signedAt: new Date(),
      },
      create: {
        orgId: session.orgId,
        sessionId: session.id,
        controlCode: body.controlCode,
        frameworkName: body.frameworkName,
        verdict: body.verdict,
        note: body.note ?? null,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({ signoff }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
