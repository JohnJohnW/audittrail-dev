import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { generateApiKey } from "@/lib/api/api-key-auth";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/keys - List API keys for the organization
 */
export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const keys = await db.apiKey.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/keys - Create a new API key
 * Body: { name: string, expiresAt?: string }
 * Returns the raw key exactly once.
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await requireAuth();

    const body = await request.json();
    const { name, expiresAt } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new AppError("Key name is required", 400, "INVALID_NAME");
    }

    if (name.length > 100) {
      throw new AppError("Key name must be 100 characters or less", 400, "NAME_TOO_LONG");
    }

    // Check key limit
    const existingCount = await db.apiKey.count({
      where: { orgId, revokedAt: null },
    });

    const MAX_KEYS_PER_ORG = 10;
    if (existingCount >= MAX_KEYS_PER_ORG) {
      throw new AppError(
        `Maximum of ${MAX_KEYS_PER_ORG} active API keys per organization`,
        400,
        "KEY_LIMIT_REACHED"
      );
    }

    const { rawKey, hash, prefix } = generateApiKey();

    const apiKey = await db.apiKey.create({
      data: {
        orgId,
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned once
        keyPrefix: apiKey.keyPrefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
