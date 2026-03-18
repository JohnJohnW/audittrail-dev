/**
 * Custom Framework Mapping API
 *
 * POST: accepts custom framework controls, embeds each via Gemini Embedding 2,
 * runs cosine similarity against the org's full multimodal evidence corpus
 * via Supabase RPC, returns coverage with confidence.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { hasProSubscription } from "@/lib/db";
import { mapCustomFramework } from "@/lib/framework-mapper";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError(
        "Custom framework mapping requires a Pro subscription",
        403,
        "PRO_REQUIRED"
      );
    }

    const body = await request.json();
    const { frameworkName, controls } = body;

    if (!frameworkName || !Array.isArray(controls) || controls.length === 0) {
      throw new AppError("frameworkName and controls[] are required", 400, "MISSING_FIELDS");
    }

    if (controls.length > 200) {
      throw new AppError("Maximum 200 controls per framework", 400, "TOO_MANY_CONTROLS");
    }

    // Validate each control
    for (const c of controls) {
      if (!c.code || !c.title || !c.description) {
        throw new AppError(
          "Each control must have code, title, and description",
          400,
          "INVALID_CONTROL"
        );
      }
    }

    // Map controls to evidence
    const mappedControls = await mapCustomFramework(orgId, controls);

    // Save the custom framework
    const { randomUUID } = await import("crypto");
    const supabase = getSupabaseClient();

    const id = randomUUID();
    await supabase.from("custom_frameworks").upsert(
      {
        id,
        org_id: orgId,
        name: frameworkName,
        controls: JSON.stringify(controls),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // Compute summary
    const covered = mappedControls.filter((c) => c.evidenceCount > 0).length;
    const highConfidence = mappedControls.filter((c) => c.confidenceTier === "high").length;

    return NextResponse.json({
      frameworkName,
      totalControls: controls.length,
      coveredControls: covered,
      coveragePercent: Math.round((covered / controls.length) * 100),
      highConfidenceCount: highConfidence,
      controls: mappedControls,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
