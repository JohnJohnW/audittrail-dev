import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth, requireAdminOrOwner } from "@/lib/api/auth";
import { parseBodyWithSchema } from "@/lib/api/request";
import { generateApiKey } from "@/lib/api/api-key-auth";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CreateKeySchema = z.object({
  name: z
    .string()
    .min(1, "Key name is required")
    .max(100, "Key name must be 100 characters or less")
    .transform((s) => s.trim()),
  expiresAt: z.string().optional().nullable(),
});

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
 * Requires admin or owner role.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireAuth();
    requireAdminOrOwner(ctx);
    const { orgId } = ctx;

    const { name, expiresAt } = await parseBodyWithSchema(request, CreateKeySchema);

    const { rawKey, hash, prefix } = generateApiKey();

    // Use a transaction to prevent race condition on key limit check
    const MAX_KEYS_PER_ORG = 10;
    const apiKey = await db.$transaction(async (tx) => {
      const existingCount = await tx.apiKey.count({
        where: { orgId, revokedAt: null },
      });

      if (existingCount >= MAX_KEYS_PER_ORG) {
        throw new AppError(
          `Maximum of ${MAX_KEYS_PER_ORG} active API keys per organization`,
          400,
          "KEY_LIMIT_REACHED"
        );
      }

      return tx.apiKey.create({
        data: {
          orgId,
          name,
          keyHash: hash,
          keyPrefix: prefix,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
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
