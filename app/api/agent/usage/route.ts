/**
 * AI Usage Stats API
 *
 * GET: Aggregated AI usage for the current month, including token totals,
 *      cost, and per-feature breakdown.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Aggregate usage by feature for the current month
    const usageByFeature = await db.aIUsageLog.groupBy({
      by: ["feature"],
      where: {
        orgId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: {
        tokensInput: true,
        tokensOutput: true,
        costCents: true,
      },
      _count: true,
    });

    // Calculate totals across all features
    let totalTokens = 0;
    let totalCostCents = 0;
    const features = usageByFeature.map((row) => {
      const input = row._sum.tokensInput ?? 0;
      const output = row._sum.tokensOutput ?? 0;
      const cost = row._sum.costCents ?? 0;
      totalTokens += input + output;
      totalCostCents += cost;
      return {
        feature: row.feature,
        tokensInput: input,
        tokensOutput: output,
        totalTokens: input + output,
        costCents: cost,
        count: row._count,
      };
    });

    // Fetch subscription counters
    const subscription = await db.subscription.findFirst({
      where: { orgId },
      select: {
        agentRunsThisMonth: true,
        policyDraftsThisMonth: true,
        plan: true,
      },
    });

    // Recent usage logs for detail view
    const logs = await db.aIUsageLog.findMany({
      where: {
        orgId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      totalTokens,
      totalCostCents,
      runsThisMonth: subscription?.agentRunsThisMonth ?? 0,
      policiesThisMonth: subscription?.policyDraftsThisMonth ?? 0,
      plan: subscription?.plan ?? "free",
      features,
      logs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
