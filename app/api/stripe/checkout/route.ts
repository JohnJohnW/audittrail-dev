import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { createCheckoutSession } from "@/lib/stripe";
import { handleApiError, AppError } from "@/lib/error-handler";

export async function POST() {
  try {
    const { session, orgId } = await requireAuth();

    if (!session.user?.email) {
      throw new AppError("Email required", 400, "EMAIL_REQUIRED");
    }

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new AppError("Server configuration error", 500, "CONFIG_ERROR");
    }

    const checkoutSession = await createCheckoutSession({
      orgId,
      userEmail: session.user.email,
      successUrl: `${baseUrl}/settings?success=true`,
      cancelUrl: `${baseUrl}/settings?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
