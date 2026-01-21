import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { handleApiError } from "@/lib/error-handler";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
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
