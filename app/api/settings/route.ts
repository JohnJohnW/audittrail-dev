import { NextResponse } from "next/server";
import { requireAuth, parseJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import {
  getOrgNotificationPreferences,
  updateOrgNotificationPreferences,
} from "@/lib/notifications";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const [organization, subscription, notificationPreferences] = await Promise.all([
      db.organization.findUnique({
        where: { id: orgId },
        select: { name: true, slug: true },
      }),
      db.subscription.findUnique({
        where: { orgId },
      }),
      getOrgNotificationPreferences(orgId),
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
      notificationPreferences,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

interface UpdateSettingsBody {
  notificationPreferences?: {
    syncFailures?: boolean;
    weeklyDigest?: boolean;
    exportReady?: boolean;
    subscriptionUpdates?: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireAuth();
    const body = await parseJsonBody<UpdateSettingsBody>(request);

    if (body.notificationPreferences) {
      await updateOrgNotificationPreferences(orgId, body.notificationPreferences);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
