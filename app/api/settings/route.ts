import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

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
            currentPeriodEnd:
              subscription.currentPeriodEnd?.toISOString() || null,
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
