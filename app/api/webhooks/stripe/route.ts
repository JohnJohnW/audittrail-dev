import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe, getPlanFromPriceId } from "@/lib/stripe";
import { db } from "@/lib/db";
import { isValidCuid } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // Safely read request body
  let body: string;
  try {
    body = await request.text();
  } catch (error) {
    logger.error("Failed to read request body", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Validate webhook secret exists
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.error("Webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Helper to validate orgId from metadata
  const validateOrgId = (orgId: string | undefined): string | null => {
    if (!orgId || !isValidCuid(orgId)) {
      if (orgId) logger.warn(`Invalid orgId format in webhook metadata: ${orgId}`);
      return null;
    }
    return orgId;
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = validateOrgId(session.metadata?.orgId);

        if (orgId && session.subscription && session.customer) {
          // Determine plan from metadata or fall back to "starter"
          const plan = session.metadata?.plan ?? "starter";
          await db.subscription.update({
            where: { orgId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: "active",
              plan,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = validateOrgId(subscription.metadata?.orgId);

        if (orgId) {
          // Determine plan from subscription items price ID
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = priceId
            ? getPlanFromPriceId(priceId)
            : (subscription.metadata?.plan ?? "starter");
          await db.subscription.update({
            where: { orgId },
            data: {
              status: subscription.status === "active" ? "active" : subscription.status,
              plan: subscription.status === "active" ? plan : "free",
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = validateOrgId(subscription.metadata?.orgId);

        if (orgId) {
          await db.subscription.update({
            where: { orgId },
            data: {
              status: "canceled",
              plan: "free",
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const orgId = validateOrgId(subscription.metadata?.orgId);

            if (orgId) {
              await db.subscription.update({
                where: { orgId },
                data: {
                  status: "past_due",
                },
              });

              // Surface payment failures to ops, log at ERROR so Sentry captures them.
              logger.error("Payment failed for subscription", undefined, {
                orgId,
                subscriptionId,
                invoiceId: invoice.id,
                attemptCount: invoice.attempt_count ?? 1,
                amountDue: invoice.amount_due,
                currency: invoice.currency,
                nextPaymentAttempt: invoice.next_payment_attempt
                  ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                  : null,
              });
            }
          } catch (retrieveError) {
            logger.error("Failed to retrieve subscription for payment_failed event", retrieveError);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook handler error", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
