/**
 * CISO Executive Summary API
 *
 * POST: generate/regenerate AI-drafted board narrative via Claude API.
 * Cached 24h. Never blocks - returns cached or "generating..." state.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { hasProSubscription } from "@/lib/db";
import { generateExecutiveSummary } from "@/lib/ai-summary";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Executive summary requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    // Fire and forget - return immediately
    const result = await generateExecutiveSummary(orgId);

    if (!result) {
      return NextResponse.json({
        status: "unavailable",
        message:
          "Executive summary generation is not available. Check ANTHROPIC_API_KEY configuration.",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Executive summary API error", error);
    return handleApiError(error);
  }
}
