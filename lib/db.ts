import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// Track connection pool errors for monitoring
let connectionPoolErrorCount = 0;
let lastConnectionPoolError: Date | null = null;

// Use a more reliable global pattern for serverless environments
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prisma Client singleton pattern for serverless environments
// This ensures we reuse the same connection pool across function invocations
// In Vercel/serverless, we need to use globalThis to persist across invocations
export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Connection pool configuration for Supabase pgbouncer (session mode)
    // connection_limit=1 is required when using pgbouncer in session mode
    // This is set via DATABASE_URL query params, but we ensure it's documented here
  });

// Always set the global to ensure reuse (critical for serverless to avoid connection pool exhaustion)
// This must be set in both dev and production for serverless environments
globalThis.__prisma = db;

// =============================================================================
// Error Handling Utilities
// =============================================================================

/**
 * Check if error is a connection pool exhaustion error
 */
function isConnectionPoolError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("MaxClientsInSessionMode") ||
      error.message.includes("max clients reached") ||
      error.message.includes("connection pool") ||
      error.message.includes("too many clients")
    );
  }
  return false;
}

/**
 * Execute a database operation with retry logic for connection pool errors.
 *
 * @param operation - The database operation to execute
 * @param fallback - Value to return if the operation fails
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns The operation result or fallback
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  maxRetries: number = 2
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Retry on connection pool errors with exponential backoff
      if (isConnectionPoolError(error) && attempt < maxRetries) {
        connectionPoolErrorCount++;
        lastConnectionPoolError = new Date();
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        logger.warn(`Connection pool error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
          errorCount: connectionPoolErrorCount,
          lastError: lastConnectionPoolError,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      logger.error("Database operation failed", error);
      return fallback;
    }
  }
  
  logger.error("Database operation failed after retries", lastError);
  return fallback;
}

/**
 * Execute a database operation with error handling and retry logic.
 * Throws the error after logging it.
 *
 * @param operation - The database operation to execute
 * @param context - Context string for error logging
 * @param maxRetries - Maximum number of retries for connection pool errors (default: 2)
 * @returns The operation result
 * @throws The original error after logging
 */
export async function dbOperation<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Retry on connection pool errors with exponential backoff
      if (isConnectionPoolError(error) && attempt < maxRetries) {
        connectionPoolErrorCount++;
        lastConnectionPoolError = new Date();
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        logger.warn(`Connection pool error in ${context}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
          errorCount: connectionPoolErrorCount,
          lastError: lastConnectionPoolError,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      logger.error(`Database operation failed: ${context}`, error);
      throw error;
    }
  }
  
  logger.error(`Database operation failed after retries: ${context}`, lastError);
  throw lastError;
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

// =============================================================================
// Connection Pool Monitoring
// =============================================================================

/**
 * Get connection pool error metrics for monitoring.
 * Useful for health checks and alerting.
 */
export function getConnectionPoolMetrics() {
  return {
    errorCount: connectionPoolErrorCount,
    lastError: lastConnectionPoolError,
    hasRecentErrors: lastConnectionPoolError
      ? Date.now() - lastConnectionPoolError.getTime() < 5 * 60 * 1000 // Last 5 minutes
      : false,
  };
}

/**
 * Reset connection pool error metrics (useful for testing or after resolving issues).
 */
export function resetConnectionPoolMetrics() {
  connectionPoolErrorCount = 0;
  lastConnectionPoolError = null;
}
