import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

type Params = { params: { controlCode: string } };

/**
 * GET /api/controls/[controlCode]/evidence-feedback?framework=X
 * Returns all evidence ratings this org has submitted for a control+framework.
 * Response: { ratings: Record<evidenceHash, "positive" | "negative"> }
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;
    const frameworkName = request.nextUrl.searchParams.get("framework");

    if (!frameworkName)
      throw new AppError("framework query param required", 400, "INVALID_REQUEST");

    const rows = await db.evidenceFeedback.findMany({
      where: { orgId, controlCode, frameworkName },
      select: { evidenceHash: true, rating: true },
    });

    const ratings: Record<string, string> = {};
    for (const row of rows) {
      ratings[row.evidenceHash] = row.rating;
    }

    return NextResponse.json({ ratings });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/controls/[controlCode]/evidence-feedback
 * Upsert a thumbs-up / thumbs-down rating on a single evidence item.
 * Body: { frameworkName: string, evidenceHash: string, rating: "positive" | "negative" }
 *
 * Send rating: null to remove an existing rating.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth();
    const { controlCode } = params;

    const body = (await request.json()) as {
      frameworkName?: string;
      evidenceHash?: string;
      rating?: "positive" | "negative" | null;
    };

    if (!body.frameworkName)
      throw new AppError("frameworkName is required", 400, "INVALID_REQUEST");
    if (!body.evidenceHash?.trim())
      throw new AppError("evidenceHash is required", 400, "INVALID_REQUEST");
    if (body.rating !== null && body.rating !== "positive" && body.rating !== "negative")
      throw new AppError('rating must be "positive", "negative", or null', 400, "INVALID_REQUEST");

    const where = {
      orgId_controlCode_frameworkName_evidenceHash: {
        orgId,
        controlCode,
        frameworkName: body.frameworkName,
        evidenceHash: body.evidenceHash,
      },
    };

    if (body.rating === null) {
      // Remove rating
      await db.evidenceFeedback.deleteMany({
        where: {
          orgId,
          controlCode,
          frameworkName: body.frameworkName,
          evidenceHash: body.evidenceHash,
        },
      });
      return NextResponse.json({ removed: true });
    }

    const feedback = await db.evidenceFeedback.upsert({
      where,
      update: { rating: body.rating },
      create: {
        orgId,
        controlCode,
        frameworkName: body.frameworkName,
        evidenceHash: body.evidenceHash,
        rating: body.rating,
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    return handleApiError(error);
  }
}
