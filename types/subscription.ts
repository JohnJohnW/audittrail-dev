/**
 * Subscription and Billing Types
 */

// Subscription plan levels
export type SubscriptionPlan = "free" | "pro";

// Subscription statuses
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "free";

// Organization membership roles
export type MembershipRole = "member" | "admin" | "owner";

/**
 * Subscription settings for display.
 */
export interface SubscriptionSettings {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

/**
 * Organization settings for display.
 */
export interface OrganizationSettings {
  name: string;
  slug: string;
}
