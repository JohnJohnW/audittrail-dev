import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPortalSession } from "@/lib/stripe";
import { handleApiError } from "@/lib/error-handler";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
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
