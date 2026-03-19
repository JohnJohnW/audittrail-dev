import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError, AppError } from "@/lib/error-handler";
import { isValidCuid } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getConfidenceTier } from "@/lib/embeddings";
import { getSupabaseClient } from "@/lib/supabase";
import { getCached, getCacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Attempt to enrich evidence controls with embedding-based confidence scores.
 *
 * Optimised: fetches all control embeddings + all org evidence embeddings in
 * 2 queries, then computes cosine similarity locally - avoiding N RPC calls.
 * Degrades gracefully - if the vector store is empty or unavailable, controls
 * are returned unchanged.
 */
async function enrichWithEmbeddingConfidence(
  orgId: string,
  controls: Array<{ controlCode: string; frameworkName: string }>
): Promise<Map<string, { mappingConfidence: number; confidenceTier: "high" | "medium" | "low" }>> {
  const confidenceMap = new Map<
    string,
    { mappingConfidence: number; confidenceTier: "high" | "medium" | "low" }
  >();

  try {
    const supabase = getSupabaseClient();

    // 1. Fetch control embeddings + org evidence embeddings in parallel (2 queries total)
    const [ceResult, eeResult] = await Promise.all([
      supabase
        .from("control_embeddings")
        .select("control_code, embedding")
        .in(
          "control_code",
          controls.map((c) => c.controlCode)
        ),
      supabase
        .from("evidence_embeddings")
        .select("source_id, embedding")
        .eq("org_id", orgId)
        .limit(500), // cap to avoid very large payloads
    ]);

    const controlEmbeddings = ceResult.data;
    const evidenceEmbeddings = eeResult.data;

    if (!controlEmbeddings || controlEmbeddings.length === 0) {
      // Vector store not seeded yet - degrade gracefully
      return confidenceMap;
    }

    if (!evidenceEmbeddings || evidenceEmbeddings.length === 0) {
      // No evidence embeddings stored yet - degrade gracefully
      return confidenceMap;
    }

    // Parse evidence embedding vectors once (they arrive as arrays or strings)
    const parsedEvidence = evidenceEmbeddings.map((ee) => ({
      vec:
        typeof ee.embedding === "string"
          ? (JSON.parse(ee.embedding) as number[])
          : (ee.embedding as number[]),
    }));

    // 2. For each control, compute local cosine similarity against all evidence
    for (const ce of controlEmbeddings) {
      const controlVec: number[] =
        typeof ce.embedding === "string"
          ? (JSON.parse(ce.embedding) as number[])
          : (ce.embedding as number[]);

      // Precompute norm for control vector
      let controlNorm = 0;
      for (const v of controlVec) controlNorm += v * v;
      controlNorm = Math.sqrt(controlNorm);

      if (controlNorm === 0) continue;

      let maxSim = 0;
      for (const { vec } of parsedEvidence) {
        if (vec.length !== controlVec.length) continue;
        let dot = 0;
        let evNorm = 0;
        for (let i = 0; i < controlVec.length; i++) {
          dot += controlVec[i] * vec[i];
          evNorm += vec[i] * vec[i];
        }
        evNorm = Math.sqrt(evNorm);
        if (evNorm === 0) continue;
        const sim = dot / (controlNorm * evNorm);
        if (sim > maxSim) maxSim = sim;
      }

      if (maxSim > 0) {
        confidenceMap.set(ce.control_code, {
          mappingConfidence: Math.round(maxSim * 100) / 100,
          confidenceTier: getConfidenceTier(maxSim),
        });
      }
    }
  } catch (err) {
    // Non-critical - log and continue without confidence data
    logger.warn("Embedding confidence enrichment failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return confidenceMap;
}

export async function GET(request: NextRequest) {
  try {
    logger.info("Evidence API request received");
    const { orgId } = await requireAuth();
    logger.info("Auth successful", { orgId });

    // Parse and validate repository filter from query params
    const repoIdsParam = request.nextUrl.searchParams.get("repositoryIds");
    const repositoryIds = repoIdsParam
      ? repoIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    // Reject any IDs that aren't valid CUIDs to prevent injection / unexpected DB queries
    if (repositoryIds && !repositoryIds.every(isValidCuid)) {
      throw new AppError("Invalid repositoryId format", 400, "INVALID_ID");
    }

    logger.info("Fetching compliance evidence", { orgId, repositoryIds });
    const evidenceCacheKey = getCacheKey(
      "evidence",
      orgId,
      ...(repositoryIds?.slice().sort() ?? [])
    );
    const evidence = await getCached(
      evidenceCacheKey,
      () => getComplianceEvidence(orgId, { repositoryIds }),
      300 // 5-minute TTL; invalidated by sync via invalidateCache()
    );
    logger.info("Evidence fetched", {
      frameworkCount: evidence.frameworks.length,
      controlCount: evidence.controls.length,
    });

    // Enrich controls with embedding confidence scores - cached separately (10 min TTL)
    const confCacheKey = getCacheKey("embeddings:conf", orgId);
    const confObject = await getCached<
      Record<string, { mappingConfidence: number; confidenceTier: "high" | "medium" | "low" }>
    >(
      confCacheKey,
      async () => {
        const map = await enrichWithEmbeddingConfidence(orgId, evidence.controls);
        return Object.fromEntries(map);
      },
      600 // 10-minute TTL; embeddings change less frequently than evidence
    );
    const confidenceMap = new Map(Object.entries(confObject));

    // Merge confidence data into controls
    const enrichedControls = evidence.controls.map((control) => {
      const conf = confidenceMap.get(control.controlCode);
      return conf ? { ...control, ...conf } : control;
    });

    const summary = getEvidenceSummary(evidence.controls);
    logger.info("Summary calculated", { summary });

    return NextResponse.json({
      ...evidence,
      controls: enrichedControls,
      summary,
    });
  } catch (error) {
    logger.error("Evidence API error", error);
    return handleApiError(error);
  }
}
