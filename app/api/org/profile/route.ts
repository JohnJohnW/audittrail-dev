import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

const VALID_INDUSTRIES = ["saas", "fintech", "healthcare", "government", "other"] as const;
const VALID_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

/**
 * GET /api/org/profile
 * Fetch the org's profile (industry, company size, tech stack).
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const profile = await db.orgProfile.findUnique({
      where: { orgId },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/org/profile
 * Upsert the org's profile.
 * Body: { industry?, companySize?, techStack? }
 */
export async function PUT(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const body = (await request.json()) as {
      industry?: string;
      companySize?: string;
      techStack?: string[];
    };

    if (
      body.industry &&
      !VALID_INDUSTRIES.includes(body.industry as (typeof VALID_INDUSTRIES)[number])
    ) {
      throw new AppError(
        `industry must be one of: ${VALID_INDUSTRIES.join(", ")}`,
        400,
        "INVALID_REQUEST"
      );
    }

    if (
      body.companySize &&
      !VALID_SIZES.includes(body.companySize as (typeof VALID_SIZES)[number])
    ) {
      throw new AppError(
        `companySize must be one of: ${VALID_SIZES.join(", ")}`,
        400,
        "INVALID_REQUEST"
      );
    }

    const profile = await db.orgProfile.upsert({
      where: { orgId },
      update: {
        ...(body.industry !== undefined ? { industry: body.industry } : {}),
        ...(body.companySize !== undefined ? { companySize: body.companySize } : {}),
        ...(body.techStack !== undefined ? { techStack: body.techStack } : {}),
        updatedAt: new Date(),
      },
      create: {
        orgId,
        industry: body.industry ?? null,
        companySize: body.companySize ?? null,
        techStack: body.techStack ?? [],
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}
