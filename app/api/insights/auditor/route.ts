import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/auditor
 *
 * Aggregates all ControlSignoff records for this org and surfaces the
 * controls that auditors most frequently flag as needing attention.
 *
 * Only returned when the org has at least 1 completed auditor session with
 * at least 1 signoff — ensures the card only shows meaningful data.
 *
 * Response:
 * {
 *   sessionCount: number,
 *   patterns: [
 *     {
 *       controlCode: string,
 *       frameworkName: string,
 *       approved: number,
 *       needsMoreInfo: number,
 *       rejected: number,
 *       totalSignoffs: number,
 *       attentionScore: number   // needsMoreInfo * 1 + rejected * 2
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Count auditor sessions for this org
    const sessionCount = await db.auditorSession.count({
      where: { orgId },
    });

    // Fetch all signoffs for this org
    const signoffs = await db.controlSignoff.findMany({
      where: { orgId },
      select: { controlCode: true, frameworkName: true, verdict: true },
    });

    if (signoffs.length === 0) {
      return NextResponse.json({ sessionCount, patterns: [] });
    }

    // Aggregate by control + framework
    type ControlKey = string;
    const agg = new Map<
      ControlKey,
      {
        controlCode: string;
        frameworkName: string;
        approved: number;
        needsMoreInfo: number;
        rejected: number;
      }
    >();

    for (const s of signoffs) {
      const key = `${s.controlCode}|${s.frameworkName}`;
      if (!agg.has(key)) {
        agg.set(key, {
          controlCode: s.controlCode,
          frameworkName: s.frameworkName,
          approved: 0,
          needsMoreInfo: 0,
          rejected: 0,
        });
      }
      const entry = agg.get(key)!;
      if (s.verdict === "approved") entry.approved++;
      else if (s.verdict === "needs_more_info") entry.needsMoreInfo++;
      else if (s.verdict === "rejected") entry.rejected++;
    }

    // Build sorted patterns — highest attention score first
    const patterns = Array.from(agg.values())
      .map((e) => ({
        ...e,
        totalSignoffs: e.approved + e.needsMoreInfo + e.rejected,
        attentionScore: e.needsMoreInfo * 1 + e.rejected * 2,
      }))
      .filter((p) => p.attentionScore > 0) // Only show controls with actual flags
      .sort((a, b) => b.attentionScore - a.attentionScore)
      .slice(0, 10); // Top 10 controls

    return NextResponse.json({ sessionCount, patterns });
  } catch (error) {
    return handleApiError(error);
  }
}
