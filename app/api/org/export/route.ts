/**
 * Org Data Export API
 *
 * POST: triggers export job
 * GET: returns status + download URL
 * Pro-gated.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { hasProSubscription } from "@/lib/db";
import { generateFullExport } from "@/lib/full-export";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { orgId } = await requireAuth();
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Data export requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const { storagePath, manifest } = await generateFullExport(orgId);

    // Generate a signed URL for download (valid 1 hour)
    const supabase = getSupabaseClient();
    const { data: signedUrl } = await supabase.storage
      .from("evidence-uploads")
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      status: "complete",
      manifest,
      downloadUrl: signedUrl?.signedUrl || null,
      expiresIn: "1 hour",
    });
  } catch (error) {
    logger.error("Export API error", error);
    return handleApiError(error);
  }
}
