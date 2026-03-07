/**
 * API Key Authentication Middleware
 *
 * Authenticates requests using API keys (Bearer tokens).
 * Keys are stored as SHA-256 hashes; the raw key is never persisted.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

export interface ApiKeyAuthContext {
  orgId: string;
  keyId: string;
}

/**
 * Hash an API key using SHA-256.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key with the `atk_` prefix.
 * Returns both the raw key (to show once) and the hash (to store).
 */
export function generateApiKey(): { rawKey: string; hash: string; prefix: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const rawKey = `atk_${hex}`;
  const hash = hashApiKey(rawKey);
  const prefix = `atk_${hex.slice(0, 8)}...`;
  return { rawKey, hash, prefix };
}

/**
 * Authenticate a request using an API key from the Authorization header.
 *
 * @param request - The incoming request
 * @throws AppError with 401 if key is missing, invalid, expired, or revoked
 * @returns ApiKeyAuthContext with orgId and keyId
 */
export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuthContext> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    throw new AppError("Missing Authorization header", 401, "MISSING_AUTH");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new AppError(
      "Invalid Authorization header format. Use: Bearer <api-key>",
      401,
      "INVALID_AUTH_FORMAT"
    );
  }

  const rawKey = parts[1];
  if (!rawKey.startsWith("atk_")) {
    throw new AppError("Invalid API key format", 401, "INVALID_KEY_FORMAT");
  }

  const keyHash = hashApiKey(rawKey);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    throw new AppError("Invalid API key", 401, "INVALID_KEY");
  }

  if (apiKey.revokedAt) {
    throw new AppError("API key has been revoked", 401, "KEY_REVOKED");
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AppError("API key has expired", 401, "KEY_EXPIRED");
  }

  // Update last used timestamp (fire-and-forget to not block the request)
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      logger.warn("Failed to update API key lastUsedAt", { error: String(err) });
    });

  return {
    orgId: apiKey.orgId,
    keyId: apiKey.id,
  };
}
