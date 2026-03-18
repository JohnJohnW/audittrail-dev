/**
 * Embeddings Module — Supabase Vector Store + Gemini Embedding 2
 *
 * Provides multimodal embedding generation (text, image, PDF, audio, video)
 * and vector store operations via Supabase's pgvector extension.
 *
 * All modalities embed into the same 768-dimensional vector space, enabling
 * cross-modal compliance evidence matching (e.g., a text control description
 * can match an uploaded architecture diagram or policy PDF).
 */

import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type {
  EmbeddingPart,
  EmbeddingSourceType,
  EvidenceMatch,
  ControlMatch,
} from "@/types/embeddings";

// =============================================================================
// Configuration
// =============================================================================

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20; // Gemini batch limit
const RATE_LIMIT_DELAY_MS = 200; // Between batches

/** Thresholds for confidence tiers */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.6,
  DEFAULT_MATCH: 0.5,
  EVIDENCE_MATCH: 0.6,
} as const;

// =============================================================================
// Gemini Client
// =============================================================================

let genaiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (genaiClient) return genaiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required for embeddings");
  }

  genaiClient = new GoogleGenAI({ apiKey });
  return genaiClient;
}

// =============================================================================
// Embedding Generation — Multimodal
// =============================================================================

/**
 * Generate a text embedding via Gemini Embedding 2.
 */
export async function embedText(text: string): Promise<number[]> {
  const ai = getGenAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ parts: [{ text }] }],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Generate an image embedding (PNG, JPEG) via Gemini Embedding 2.
 */
export async function embedImage(base64: string, mimeType: string): Promise<number[]> {
  const ai = getGenAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        parts: [{ inlineData: { mimeType, data: base64 } }],
      },
    ],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Generate a PDF embedding via Gemini Embedding 2.
 * Gemini reads PDF text via built-in OCR (up to 6 pages).
 */
export async function embedPdf(base64: string): Promise<number[]> {
  const ai = getGenAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        parts: [{ inlineData: { mimeType: "application/pdf", data: base64 } }],
      },
    ],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Generate an audio embedding (MP3, WAV — up to 80s) via Gemini Embedding 2.
 */
export async function embedAudio(base64: string, mimeType: string): Promise<number[]> {
  const ai = getGenAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        parts: [{ inlineData: { mimeType, data: base64 } }],
      },
    ],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Generate an aggregated multimodal embedding from multiple parts.
 * E.g., a description + screenshot → single vector.
 */
export async function embedMultipart(parts: EmbeddingPart[]): Promise<number[]> {
  const ai = getGenAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ parts }],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Batch-embed multiple text strings with rate limiting.
 * Groups into batches of 20 to stay within API limits.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const ai = getGenAI();

    const batchResults = await Promise.all(
      batch.map((text) =>
        ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: [{ parts: [{ text }] }],
          config: { outputDimensionality: EMBEDDING_DIMENSIONS },
        })
      )
    );

    for (const r of batchResults) {
      results.push(r.embeddings?.[0]?.values ?? []);
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return results;
}

// =============================================================================
// Text Builders — Convert Structured Artifacts to Embeddable Text
// =============================================================================

/**
 * Build an embeddable text from a commit record.
 */
export function buildCommitText(commit: {
  message: string;
  authorName: string;
  verified: boolean;
}): string {
  const parts = [
    `Commit: ${commit.message}`,
    `Author: ${commit.authorName}`,
    commit.verified ? "Signed: yes" : "Signed: no",
  ];
  return parts.join("\n");
}

/**
 * Build an embeddable text from a pull request record.
 */
export function buildPullRequestText(pr: {
  title: string;
  body: string | null;
  state: string;
  baseBranch: string;
  headBranch: string;
}): string {
  const parts = [
    `Pull Request: ${pr.title}`,
    pr.body ? `Description: ${pr.body.slice(0, 500)}` : "",
    `State: ${pr.state}`,
    `Branches: ${pr.headBranch} → ${pr.baseBranch}`,
  ];
  return parts.filter(Boolean).join("\n");
}

/**
 * Build an embeddable text from branch protection settings.
 */
export function buildBranchProtectionText(bp: {
  branch: string;
  requirePullRequest: boolean;
  requiredApprovals: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
  enforceAdmins: boolean;
  requireStatusChecks: boolean;
}): string {
  const parts = [
    `Branch Protection for: ${bp.branch}`,
    `Require PR: ${bp.requirePullRequest}`,
    `Required approvals: ${bp.requiredApprovals}`,
    `Dismiss stale reviews: ${bp.dismissStaleReviews}`,
    `Require code owners: ${bp.requireCodeOwners}`,
    `Enforce admins: ${bp.enforceAdmins}`,
    `Require status checks: ${bp.requireStatusChecks}`,
  ];
  return parts.join("\n");
}

// =============================================================================
// Vector Store Operations — Supabase
// =============================================================================

/**
 * Store an evidence embedding in the Supabase vector store.
 */
export async function storeEvidenceEmbedding(
  orgId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string,
  embedding: number[],
  contentHash: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const id = `${sourceType}:${sourceId}`;

  const { error } = await supabase.from("evidence_embeddings").upsert(
    {
      id,
      org_id: orgId,
      source_type: sourceType,
      source_id: sourceId,
      content_hash: contentHash,
      embedding: `[${embedding.join(",")}]`,
    },
    { onConflict: "id" }
  );

  if (error) {
    logger.error("Failed to store evidence embedding", { id, error: error.message });
    throw error;
  }
}

/**
 * Store a control embedding in the Supabase vector store.
 */
export async function storeControlEmbedding(
  controlCode: string,
  frameworkName: string,
  content: string,
  embedding: number[]
): Promise<void> {
  const supabase = getSupabaseClient();
  const id = `${frameworkName}:${controlCode}`;

  const { error } = await supabase.from("control_embeddings").upsert(
    {
      id,
      control_code: controlCode,
      framework_name: frameworkName,
      content,
      embedding: `[${embedding.join(",")}]`,
    },
    { onConflict: "id" }
  );

  if (error) {
    logger.error("Failed to store control embedding", { id, error: error.message });
    throw error;
  }
}

/**
 * Find evidence similar to a query embedding using Supabase RPC.
 * Calls the `match_evidence` PostgreSQL function.
 */
export async function findSimilarEvidence(
  orgId: string,
  queryEmbedding: number[],
  threshold: number = CONFIDENCE_THRESHOLDS.EVIDENCE_MATCH,
  limit: number = 20
): Promise<EvidenceMatch[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("match_evidence", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    match_org_id: orgId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    logger.error("Failed to find similar evidence", { error: error.message });
    return [];
  }

  return (data ?? []) as EvidenceMatch[];
}

/**
 * Find controls similar to an evidence embedding using Supabase RPC.
 * Calls the `match_controls` PostgreSQL function.
 */
export async function findSimilarControls(
  queryEmbedding: number[],
  threshold: number = CONFIDENCE_THRESHOLDS.DEFAULT_MATCH,
  limit: number = 10
): Promise<ControlMatch[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("match_controls", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    logger.error("Failed to find similar controls", { error: error.message });
    return [];
  }

  return (data ?? []) as ControlMatch[];
}

/**
 * Compute cosine similarity between two embeddings.
 * Returns a value between 0 and 1 (higher = more similar).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Get confidence tier for an embedding similarity score.
 */
export function getConfidenceTier(similarity: number): "high" | "medium" | "low" {
  if (similarity >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (similarity >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

// =============================================================================
// Safe Wrappers — Graceful Degradation
// =============================================================================

/**
 * Safely generate and store an evidence embedding.
 * On failure, logs the error and returns without throwing —
 * the system degrades to pattern-match only.
 */
export async function safeEmbedAndStore(
  orgId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string,
  text: string
): Promise<void> {
  try {
    const embedding = await embedText(text);
    if (embedding.length === 0) return;

    const { createHash } = await import("crypto");
    const contentHash = createHash("sha256").update(text).digest("hex").slice(0, 16);

    await storeEvidenceEmbedding(orgId, sourceType, sourceId, embedding, contentHash);
  } catch (error) {
    logger.warn("Embedding generation/storage failed (degrading to pattern-match)", {
      sourceType,
      sourceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
