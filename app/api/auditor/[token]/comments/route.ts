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
 * GET /api/auditor/[token]/comments
 * Returns all comments for this session.
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getValidSession(params.token);

    const comments = await db.auditorComment.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auditor/[token]/comments
 * Create a comment on a control.
 * Body: { controlCode, frameworkName, body }
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getValidSession(params.token);

    const body = (await request.json()) as {
      controlCode?: string;
      frameworkName?: string;
      body?: string;
    };

    if (!body.controlCode || !body.frameworkName || !body.body?.trim()) {
      throw new AppError(
        "controlCode, frameworkName, and body are required",
        400,
        "INVALID_REQUEST"
      );
    }

    const comment = await db.auditorComment.create({
      data: {
        orgId: session.orgId,
        sessionId: session.id,
        controlCode: body.controlCode,
        frameworkName: body.frameworkName,
        body: body.body.trim(),
        status: "open",
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
