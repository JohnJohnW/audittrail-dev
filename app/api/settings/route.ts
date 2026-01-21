import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const [organization, subscription] = await Promise.all([
      db.organization.findUnique({
        where: { id: orgId },
        select: { name: true, slug: true },
      }),
      db.subscription.findUnique({
        where: { orgId },
      }),
    ]);

    return NextResponse.json({
      organization,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            hasStripeCustomer: !!subscription.stripeCustomerId,
          }
        : {
            plan: "free",
            status: "free",
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            hasStripeCustomer: false,
          },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
