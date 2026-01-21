import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Execute a database operation with error handling and fallback.
 *
 * @param operation - The database operation to execute
 * @param fallback - Value to return if the operation fails
 * @returns The operation result or fallback
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("Database operation failed", error);
    return fallback;
  }
}

/**
 * Execute a database operation with error handling.
 * Throws the error after logging it.
 *
 * @param operation - The database operation to execute
 * @param context - Context string for error logging
 * @returns The operation result
 * @throws The original error after logging
 */
export async function dbOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Database operation failed: ${context}`, error);
    throw error;
  }
}

// =============================================================================
// Transaction Utilities
// =============================================================================

/**
 * Execute operations within a database transaction.
 *
 * @param fn - Function receiving the transaction client
 * @returns The result of the transaction
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>
): Promise<T> {
  return db.$transaction(fn);
}

// =============================================================================
// Pagination Utilities
// =============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Helper to create a paginated result object.
 *
 * @param data - The data items
 * @param total - Total count of all items
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @returns Paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

/**
 * Calculate pagination skip value from page number.
 *
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Skip value for Prisma
 */
export function getSkip(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

// =============================================================================
// Common Query Helpers
// =============================================================================

/**
 * Find a user with their organization membership.
 */
export async function findUserWithOrg(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });
}

/**
 * Find all active repositories for an organization.
 */
export async function findActiveRepositories(orgId: string) {
  return db.repository.findMany({
    where: {
      orgId,
      isActive: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

/**
 * Get subscription for an organization.
 */
export async function getOrgSubscription(orgId: string) {
  return db.subscription.findUnique({
    where: { orgId },
  });
}

/**
 * Check if an organization has a pro subscription.
 */
export async function hasProSubscription(orgId: string): Promise<boolean> {
  const subscription = await getOrgSubscription(orgId);
  return (
    subscription?.plan === "pro" &&
    (subscription?.status === "active" || subscription?.status === "free")
  );
}
