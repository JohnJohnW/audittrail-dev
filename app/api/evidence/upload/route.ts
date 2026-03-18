/**
 * Multimodal Evidence Upload API
 *
 * POST: accepts multipart form data (file + metadata).
 * Validates file type, stores file in Supabase Storage bucket,
 * generates embedding via Gemini Embedding 2, creates evidence_embeddings row.
 * Pro-gated.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { hasProSubscription } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase";
import { embedPdf, embedImage, embedAudio, storeEvidenceEmbedding } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, { maxSize: number; fileType: string }> = {
  "application/pdf": { maxSize: 25 * 1024 * 1024, fileType: "policy_pdf" },
  "image/png": { maxSize: 10 * 1024 * 1024, fileType: "screenshot" },
  "image/jpeg": { maxSize: 10 * 1024 * 1024, fileType: "screenshot" },
  "audio/mpeg": { maxSize: 50 * 1024 * 1024, fileType: "audio_recording" },
  "audio/wav": { maxSize: 50 * 1024 * 1024, fileType: "audio_recording" },
  "video/mp4": { maxSize: 50 * 1024 * 1024, fileType: "video_recording" },
  "video/quicktime": { maxSize: 50 * 1024 * 1024, fileType: "video_recording" },
};

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireAuth();

    // Pro gate
    const isPro = await hasProSubscription(orgId);
    if (!isPro) {
      throw new AppError("Evidence upload requires a Pro subscription", 403, "PRO_REQUIRED");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;
    const controlCodesRaw = formData.get("controlCodes") as string | null;

    if (!file) {
      throw new AppError("No file provided", 400, "MISSING_FILE");
    }

    const typeConfig = ALLOWED_TYPES[file.type];
    if (!typeConfig) {
      throw new AppError(
        `Unsupported file type: ${file.type}. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`,
        400,
        "INVALID_FILE_TYPE"
      );
    }

    if (file.size > typeConfig.maxSize) {
      throw new AppError(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${(typeConfig.maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        400,
        "FILE_TOO_LARGE"
      );
    }

    const controlCodes = controlCodesRaw
      ? controlCodesRaw
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    // Generate unique ID and storage path
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${orgId}/${id}.${ext}`;

    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("evidence-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Evidence upload failed", { error: uploadError.message });
      throw new AppError("File upload failed", 500, "UPLOAD_FAILED");
    }

    // Store metadata in uploaded_evidence table
    const { error: dbError } = await supabase.from("uploaded_evidence").insert({
      id,
      org_id: orgId,
      file_name: file.name,
      file_type: typeConfig.fileType,
      mime_type: file.type,
      storage_path: storagePath,
      description: description || null,
      control_codes: controlCodes,
      uploaded_by_id: userId,
    });

    if (dbError) {
      logger.error("Evidence metadata insert failed", { error: dbError.message });
      // Clean up uploaded file
      await supabase.storage.from("evidence-uploads").remove([storagePath]);
      throw new AppError("Failed to store evidence metadata", 500, "DB_ERROR");
    }

    // Generate embedding (async, non-blocking for response)
    const base64 = buffer.toString("base64");
    const { createHash } = await import("crypto");
    const contentHash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);

    generateAndStoreEmbedding(orgId, typeConfig.fileType, id, file.type, base64, contentHash).catch(
      (err) => logger.warn("Evidence embedding failed", { id, error: String(err) })
    );

    return NextResponse.json({
      id,
      fileName: file.name,
      fileType: typeConfig.fileType,
      storagePath,
      controlCodes,
      status: "processing",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function generateAndStoreEmbedding(
  orgId: string,
  fileType: string,
  sourceId: string,
  mimeType: string,
  base64: string,
  contentHash: string
): Promise<void> {
  let embedding: number[];

  if (mimeType === "application/pdf") {
    embedding = await embedPdf(base64);
  } else if (mimeType.startsWith("image/")) {
    embedding = await embedImage(base64, mimeType);
  } else if (mimeType.startsWith("audio/")) {
    embedding = await embedAudio(base64, mimeType);
  } else {
    // Video — embed as-is (Gemini supports video)
    const { embedMultipart } = await import("@/lib/embeddings");
    embedding = await embedMultipart([{ inlineData: { mimeType, data: base64 } }]);
  }

  if (embedding.length > 0) {
    await storeEvidenceEmbedding(
      orgId,
      fileType as "policy_pdf" | "screenshot" | "audio_recording" | "video_recording",
      sourceId,
      embedding,
      contentHash
    );
  }
}
