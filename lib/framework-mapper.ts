/**
 * Zero-Shot Framework Mapper
 *
 * Maps custom framework controls to an organization's evidence corpus
 * using Gemini Embedding 2 cosine similarity via Supabase RPC.
 * Cross-modal: text control descriptions can match uploaded PDFs, screenshots, audio.
 */

import { embedText, findSimilarEvidence, getConfidenceTier } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

export interface CustomControl {
  code: string;
  title: string;
  description: string;
}

export interface MappedControl extends CustomControl {
  evidenceCount: number;
  maxSimilarity: number;
  confidenceTier: "high" | "medium" | "low";
  matchedSources: Array<{
    sourceType: string;
    sourceId: string;
    similarity: number;
  }>;
}

/**
 * Map a set of custom controls to an org's existing evidence via embedding similarity.
 */
export async function mapCustomFramework(
  orgId: string,
  controls: CustomControl[]
): Promise<MappedControl[]> {
  const results: MappedControl[] = [];

  for (const control of controls) {
    try {
      const text = `${control.code}: ${control.title}\n${control.description}`;
      const embedding = await embedText(text);

      if (embedding.length === 0) {
        results.push({
          ...control,
          evidenceCount: 0,
          maxSimilarity: 0,
          confidenceTier: "low",
          matchedSources: [],
        });
        continue;
      }

      const matches = await findSimilarEvidence(orgId, embedding, 0.5, 10);

      const maxSim = matches.length > 0 ? Math.max(...matches.map((m) => m.similarity)) : 0;

      results.push({
        ...control,
        evidenceCount: matches.length,
        maxSimilarity: maxSim,
        confidenceTier: getConfidenceTier(maxSim),
        matchedSources: matches.map((m) => ({
          sourceType: m.source_type,
          sourceId: m.source_id,
          similarity: m.similarity,
        })),
      });
    } catch (error) {
      logger.warn(`Framework mapper: error mapping control ${control.code}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        ...control,
        evidenceCount: 0,
        maxSimilarity: 0,
        confidenceTier: "low",
        matchedSources: [],
      });
    }
  }

  return results;
}
