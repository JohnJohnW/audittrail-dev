import Stripe from "stripe";
import { AppError } from "./error-handler";
import { logger } from "./logger";
import { STRIPE_CONFIG } from "./constants";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError("STRIPE_SECRET_KEY is not configured", 500, "STRIPE_CONFIG_ERROR");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_CONFIG.API_VERSION,
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Wraps Stripe API errors with user-friendly messages
 */
function handleStripeError(error: unknown, operation: string): never {
  if (error instanceof Stripe.errors.StripeError) {
    logger.error(`Stripe ${operation} error`, error, { code: error.code });

    switch (error.type) {
      case "StripeCardError":
        throw new AppError(error.message || "Card error", 400, "STRIPE_CARD_ERROR");
      case "StripeRateLimitError":
        throw new AppError("Too many requests. Please try again later.", 429, "STRIPE_RATE_LIMIT");
      case "StripeInvalidRequestError":
        throw new AppError("Invalid request to payment provider", 400, "STRIPE_INVALID_REQUEST");
      case "StripeAuthenticationError":
        throw new AppError("Payment provider authentication failed", 500, "STRIPE_AUTH_ERROR");
      case "StripeAPIError":
        throw new AppError("Payment provider error. Please try again.", 503, "STRIPE_API_ERROR");
      case "StripeConnectionError":
        throw new AppError("Could not connect to payment provider", 503, "STRIPE_CONNECTION_ERROR");
      default:
        throw new AppError("Payment processing error", 500, "STRIPE_ERROR");
    }
  }

  logger.error(`Stripe ${operation} unexpected error`, error);
  throw new AppError(`Failed to ${operation}`, 500, "STRIPE_ERROR");
}

/**
 * Map of plan names to their Stripe price environment variable names.
 * Supports both the legacy Pro plan and the new Starter/Growth tiers.
 */
function getPriceIdForPlan(plan: string): string {
  const priceMap: Record<string, string | undefined> = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    starter: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID,
    "starter-annual": process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    growth: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID,
    "growth-annual": process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID,
  };

  const priceId = priceMap[plan];
  if (!priceId) {
    throw new AppError(
      `No Stripe price configured for plan: ${plan}. Set the corresponding environment variable.`,
      500,
      "STRIPE_CONFIG_ERROR"
    );
  }
  return priceId;
}

/**
 * Map a Stripe price ID back to a plan name (for webhook handling).
 */
export function getPlanFromPriceId(priceId: string): string {
  const priceToPlan: Record<string, string> = {};

  if (process.env.STRIPE_PRO_PRICE_ID) priceToPlan[process.env.STRIPE_PRO_PRICE_ID] = "pro";
  if (process.env.STRIPE_STARTER_MONTHLY_PRICE_ID)
    priceToPlan[process.env.STRIPE_STARTER_MONTHLY_PRICE_ID] = "starter";
  if (process.env.STRIPE_STARTER_ANNUAL_PRICE_ID)
    priceToPlan[process.env.STRIPE_STARTER_ANNUAL_PRICE_ID] = "starter";
  if (process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID)
    priceToPlan[process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID] = "growth";
  if (process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID)
    priceToPlan[process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID] = "growth";

  return priceToPlan[priceId] ?? "pro";
}

export async function createCheckoutSession({
  orgId,
  userEmail,
  successUrl,
  cancelUrl,
  plan = "starter",
}: {
  orgId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  plan?: string;
}) {
  const priceId = getPriceIdForPlan(plan);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orgId,
        plan,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          orgId,
          plan,
        },
      },
    });

    return session;
  } catch (error) {
    handleStripeError(error, "create checkout session");
  }
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    handleStripeError(error, "create portal session");
  }
}

export async function getSubscription(subscriptionId: string) {
  try {
    const stripe = getStripe();
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    handleStripeError(error, "get subscription");
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const stripe = getStripe();
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    handleStripeError(error, "cancel subscription");
  }
}
