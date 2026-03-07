/**
 * API Authentication Helpers
 *
 * Centralized authentication and authorization utilities for API routes.
 * Use these instead of repeating auth checks in every route.
 */

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/error-handler";

export interface AuthContext {
  session: Session;
  userId: string;
  orgId: string;
  orgSlug?: string;
  orgRole?: string;
}

/**
 * Require authentication and organization membership.
 *
 * @throws AppError with 401 if not authenticated
 * @throws AppError with 403 if no organization
 * @returns AuthContext with session, userId, and orgId
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   try {
 *     const { orgId } = await requireAuth();
 *     // ... rest of handler
 *   } catch (error) {
 *     return handleApiError(error);
 *   }
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = session.user.id;
  if (!userId) {
    throw new AppError("Invalid session", 401, "INVALID_SESSION");
  }

  const orgId = session.orgId;
  if (!orgId) {
    throw new AppError("No organization found", 403, "NO_ORGANIZATION");
  }

  return {
    session,
    userId,
    orgId,
    orgSlug: session.orgSlug,
    orgRole: session.orgRole,
  };
}

/**
 * Require a specific subscription plan.
 *
 * @param orgId - Organization ID to check
 * @param requiredPlan - Required plan level (default: "pro")
 * @throws AppError with 403 if subscription doesn't meet requirements
 * @returns The subscription object
 *
 * @example
 * ```typescript
 * const { orgId } = await requireAuth();
 * const subscription = await requireSubscription(orgId, "pro");
 * ```
 */
export async function requireSubscription(orgId: string, requiredPlan: "pro" | "free" = "pro") {
  const subscription = await db.subscription.findFirst({
    where: { orgId },
  });

  if (!subscription) {
    throw new AppError("No subscription found", 403, "NO_SUBSCRIPTION");
  }

  if (requiredPlan === "pro" && subscription.plan !== "pro") {
    throw new AppError("Pro subscription required", 403, "SUBSCRIPTION_REQUIRED", {
      currentPlan: subscription.plan,
      requiredPlan,
    });
  }

  if (subscription.status !== "active" && subscription.status !== "free") {
    throw new AppError("Subscription is not active", 403, "SUBSCRIPTION_INACTIVE", {
      status: subscription.status,
    });
  }

  return subscription;
}

/**
 * Check if user can export (has active pro subscription).
 * Convenience wrapper for common export permission check.
 *
 * @param orgId - Organization ID to check
 * @returns boolean indicating if exports are allowed
 */
export async function canExport(orgId: string): Promise<boolean> {
  const subscription = await db.subscription.findFirst({
    where: { orgId },
  });

  return (
    subscription?.plan === "pro" &&
    (subscription?.status === "active" || subscription?.status === "free")
  );
}
