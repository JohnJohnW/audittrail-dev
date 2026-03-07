import Stripe from "stripe";
import { AppError } from "./error-handler";
import { logger } from "./logger";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError("STRIPE_SECRET_KEY is not configured", 500, "STRIPE_CONFIG_ERROR");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
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

export async function createCheckoutSession({
  orgId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  orgId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!process.env.STRIPE_PRO_PRICE_ID) {
    throw new AppError("STRIPE_PRO_PRICE_ID is not configured", 500, "STRIPE_CONFIG_ERROR");
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orgId,
      },
      subscription_data: {
        metadata: {
          orgId,
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
