/**
 * Evidence Mapping Feedback API
 *
 * POST: record GRC manager flag/confirm/annotate on an evidence-to-control mapping.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ controlCode: string }> }
) {
  try {
    const { orgId, userId } = await requireAuth();
    const { controlCode } = await params;

    const body = await request.json();
    const { frameworkName, feedbackType, reason, note } = body;

    if (!frameworkName || !feedbackType) {
      throw new AppError("frameworkName and feedbackType are required", 400, "MISSING_FIELDS");
    }

    if (!["flag", "confirm", "annotate"].includes(feedbackType)) {
      throw new AppError("feedbackType must be flag, confirm, or annotate", 400, "INVALID_TYPE");
    }

    if (reason && typeof reason === "string" && reason.length > 5000) {
      throw new AppError("Reason must be 5000 characters or less", 400, "INVALID_REQUEST");
    }

    if (note && typeof note === "string" && note.length > 10000) {
      throw new AppError("Note must be 10000 characters or less", 400, "INVALID_REQUEST");
    }

    if (!/^[A-Za-z0-9._-]{1,50}$/.test(controlCode)) {
      throw new AppError("Invalid control code format", 400, "INVALID_CONTROL_CODE");
    }

    const { randomUUID } = await import("crypto");
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("evidence_mapping_feedback").insert({
      id: randomUUID(),
      org_id: orgId,
      control_code: controlCode,
      framework_name: frameworkName,
      feedback_type: feedbackType,
      reason: reason || null,
      note: note || null,
      author_id: userId,
    });

    if (error) {
      throw new AppError("Failed to store feedback", 500, "DB_ERROR");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
