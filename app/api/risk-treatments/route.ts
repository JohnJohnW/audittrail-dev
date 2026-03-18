/**
 * Risk Treatments API
 *
 * GET: list treatments (filterable by status, framework)
 * POST: create a new treatment
 * Pro-gated.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db, hasProSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Risk register requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const status = request.nextUrl.searchParams.get("status");
    const framework = request.nextUrl.searchParams.get("framework");

    const treatments = await db.riskTreatment.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
        ...(framework ? { frameworkName: framework } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ treatments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Risk register requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const body = await request.json();
    const {
      controlCode,
      frameworkName,
      treatmentType,
      rationale,
      ownerId,
      reviewDate,
      linkedGithubIssue,
    } = body;

    if (!controlCode || !frameworkName || !treatmentType || !rationale) {
      throw new AppError(
        "controlCode, frameworkName, treatmentType, and rationale are required",
        400,
        "MISSING_FIELDS"
      );
    }

    if (!["remediate", "accept", "transfer", "avoid"].includes(treatmentType)) {
      throw new AppError("Invalid treatmentType", 400, "INVALID_TYPE");
    }

    const treatment = await db.riskTreatment.upsert({
      where: {
        orgId_controlCode_frameworkName: {
          orgId,
          controlCode,
          frameworkName,
        },
      },
      update: {
        treatmentType,
        rationale,
        ownerId: ownerId || null,
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        linkedGithubIssue: linkedGithubIssue || null,
        status: "open",
      },
      create: {
        orgId,
        controlCode,
        frameworkName,
        treatmentType,
        rationale,
        ownerId: ownerId || null,
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        linkedGithubIssue: linkedGithubIssue || null,
        createdById: userId,
      },
    });

    return NextResponse.json({ treatment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
