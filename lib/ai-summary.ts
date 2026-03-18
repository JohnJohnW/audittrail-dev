/**
 * AI Executive Summary
 *
 * Generates a CISO-ready board narrative using Claude API.
 * Cached 24h in Redis.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
import { getCached, getCacheKey } from "@/lib/cache";
import { logger } from "@/lib/logger";

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Generate an executive summary for a CISO board presentation.
 * Uses Claude claude-sonnet-4-20250514 to draft the narrative.
 */
export async function generateExecutiveSummary(
  orgId: string
): Promise<{ summary: string; generatedAt: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not set, cannot generate executive summary");
    return null;
  }

  const cacheKey = getCacheKey("executive-summary", orgId);

  try {
    return await getCached<{ summary: string; generatedAt: string }>(
      cacheKey,
      async () => {
        // Gather compliance data
        const evidence = await getComplianceEvidence(orgId);
        const summary = getEvidenceSummary(evidence.controls);
        const frameworkScores = calculateFrameworkScores(evidence);

        // Get recent trend
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const previousSnapshot = await db.complianceSnapshot.findFirst({
          where: { orgId, snapshotDate: { lte: sevenDaysAgo } },
          orderBy: { snapshotDate: "desc" },
        });

        // Get open risks
        const openRisks = await db.riskTreatment.count({
          where: { orgId, status: { in: ["open", "overdue"] } },
        });

        // Get active audits
        const activeAudit = await db.auditCycle.findFirst({
          where: { orgId, status: { not: "closed" } },
          select: { frameworkName: true, status: true, targetCloseDate: true },
        });

        // Get org context
        const orgProfile = await db.orgProfile.findUnique({
          where: { orgId },
          select: { industry: true, companySize: true },
        });

        const org = await db.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        });

        // Build prompt
        const prompt = `You are a security compliance advisor drafting a concise executive summary for a CISO to present to their board. Write in a professional, confident tone. Use data points to support assertions. Keep it to 3-4 paragraphs.

Organization: ${org?.name || "Unknown"}
Industry: ${orgProfile?.industry || "Technology"}
Company Size: ${orgProfile?.companySize || "Unknown"}

Current Compliance Score: ${summary.score}%
Score Change (7 days): ${previousSnapshot ? `${summary.score - previousSnapshot.overallScore > 0 ? "+" : ""}${summary.score - previousSnapshot.overallScore}%` : "No previous data"}
Controls with Evidence: ${summary.withEvidence}/${summary.total}
Controls with No Evidence: ${summary.noEvidence}

Framework Scores:
${frameworkScores.map((f) => `- ${f.framework}: ${f.score}%`).join("\n")}

Open Risk Treatments: ${openRisks}
${activeAudit ? `Active Audit: ${activeAudit.frameworkName} (${activeAudit.status}), target close: ${activeAudit.targetCloseDate?.toISOString().split("T")[0] || "TBD"}` : "No active audits"}

Write the executive summary now. Do not include a title or headers — just the narrative paragraphs.`;

        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";

        return {
          summary: text,
          generatedAt: new Date().toISOString(),
        };
      },
      CACHE_TTL_SECONDS
    );
  } catch (error) {
    logger.error("Executive summary generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
