/**
 * Embedding and Vector Store Types
 */

/** Source types for evidence embeddings */
export type EmbeddingSourceType =
  | "commit"
  | "pr"
  | "branch_protection"
  | "membership_event"
  | "ci_artifact"
  | "policy_pdf"
  | "screenshot"
  | "audio_recording"
  | "video_recording";

/** A single part of a multimodal embedding input */
export type EmbeddingPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Result from the Supabase match_evidence RPC function */
export interface EvidenceMatch {
  id: string;
  source_type: EmbeddingSourceType;
  source_id: string;
  similarity: number;
}

/** Result from the Supabase match_controls RPC function */
export interface ControlMatch {
  id: string;
  control_code: string;
  framework_name: string;
  similarity: number;
}

/** Confidence tier for evidence-to-control mapping */
export type ConfidenceTier = "high" | "medium" | "low" | "auditor_confirmed";

/** Uploaded evidence metadata */
export interface MultimodalEvidenceUpload {
  fileName: string;
  fileType: "policy_pdf" | "screenshot" | "audio_recording" | "video_recording";
  mimeType: string;
  storagePath: string;
  description?: string;
  controlCodes: string[];
}
