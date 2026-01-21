import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { createPortalSession } from "@/lib/stripe";
import { handleApiError, AppError } from "@/lib/error-handler";

export async function POST() {
  try {
    const { orgId } = await requireAuth();

    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new AppError("No active subscription", 400, "NO_SUBSCRIPTION");
    }

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new AppError("Server configuration error", 500, "CONFIG_ERROR");
    }

    const portalSession = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
