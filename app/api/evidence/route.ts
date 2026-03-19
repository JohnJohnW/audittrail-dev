import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError, AppError } from "@/lib/error-handler";
import { isValidCuid } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getConfidenceTier } from "@/lib/embeddings";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Attempt to enrich evidence controls with embedding-based confidence scores.
 * Queries the control_embeddings table, then for each control calls match_evidence
 * via Supabase RPC. Degrades gracefully — if the vector store is empty or
 * unavailable, controls are returned unchanged.
 */
async function enrichWithEmbeddingConfidence(
  orgId: string,
  controls: Array<{ controlCode: string; frameworkName: string; [key: string]: unknown }>
): Promise<Map<string, { mappingConfidence: number; confidenceTier: "high" | "medium" | "low" }>> {
  const confidenceMap = new Map<
    string,
    { mappingConfidence: number; confidenceTier: "high" | "medium" | "low" }
  >();

  try {
    const supabase = getSupabaseClient();

    // Fetch stored control embeddings from the vector store
    const { data: controlEmbeddings, error } = await supabase
      .from("control_embeddings")
      .select("control_code, framework_name, embedding")
      .in(
        "control_code",
        controls.map((c) => c.controlCode)
      );

    if (error || !controlEmbeddings || controlEmbeddings.length === 0) {
      // Vector store not seeded yet — degrade gracefully
      return confidenceMap;
    }

    // For each control embedding, call match_evidence to find best similarity
    const enrichmentResults = await Promise.allSettled(
      controlEmbeddings.map(async (ce) => {
        const { data: matches } = await supabase.rpc("match_evidence", {
          query_embedding: ce.embedding,
          match_org_id: orgId,
          match_threshold: 0.4,
          match_count: 5,
        });

        const maxSim =
          matches && matches.length > 0
            ? Math.max(...matches.map((m: { similarity: number }) => m.similarity))
            : 0;

        return { controlCode: ce.control_code, similarity: maxSim };
      })
    );

    for (const result of enrichmentResults) {
      if (result.status === "fulfilled") {
        const { controlCode, similarity } = result.value;
        if (similarity > 0) {
          confidenceMap.set(controlCode, {
            mappingConfidence: Math.round(similarity * 100) / 100,
            confidenceTier: getConfidenceTier(similarity),
          });
        }
      }
    }
  } catch (err) {
    // Non-critical — log and continue without confidence data
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
    const evidence = await getComplianceEvidence(orgId, { repositoryIds });
    logger.info("Evidence fetched", {
      frameworkCount: evidence.frameworks.length,
      controlCount: evidence.controls.length,
    });

    // Enrich controls with embedding confidence scores (non-blocking, degrades gracefully)
    const confidenceMap = await enrichWithEmbeddingConfidence(orgId, evidence.controls);

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
