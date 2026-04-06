/**
 * Generated Policies API
 *
 * POST: Generate a new compliance policy document using AI
 * GET: List generated policies for the authenticated org
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, parseBodyWithSchema } from "@/lib/api";
import { handleApiError, AppError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { z } from "zod";
import { generatePolicy } from "@/lib/agent/generate-policy";
import { MODELS, type ModelId } from "@/lib/agent/anthropic";

export const dynamic = "force-dynamic";

const GeneratePolicySchema = z.object({
  frameworkName: z.string().min(1),
  policyType: z.enum([
    "information_security",
    "access_control",
    "incident_response",
    "change_management",
    "risk_management",
    "data_protection",
  ]),
  companyContext: z.string().optional(),
  model: z.enum([MODELS.OPUS, MODELS.SONNET]).optional().default(MODELS.OPUS),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Check subscription allows policy generation
    const sub = await db.subscription.findFirst({
      where: { orgId },
    });

    if (!sub) {
      throw new AppError("No subscription found", 403, "NO_SUBSCRIPTION");
    }

    if (sub.plan === "free") {
      throw new AppError("Policy generation requires Starter plan or above", 403, "PLAN_REQUIRED");
    }

    const body = await parseBodyWithSchema(request, GeneratePolicySchema);

    const result = await generatePolicy({
      orgId,
      frameworkName: body.frameworkName,
      policyType: body.policyType,
      companyContext: body.companyContext,
      model: body.model as ModelId,
    });

    return NextResponse.json(
      {
        policyId: result.policyId,
        content: result.content,
        tokensUsed: result.tokensUsed,
        costCents: result.costCents,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const policies = await db.generatedPolicy.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    return handleApiError(error);
  }
}
