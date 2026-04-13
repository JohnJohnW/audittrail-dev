import { getAnthropicClient, calculateCostCents, MODELS, type ModelId } from "./anthropic";
import { getPolicySystemPrompt } from "./prompts";
import { db } from "@/lib/db";

/**
 * Generate a compliance policy document using Claude.
 */
export async function generatePolicy({
  orgId,
  frameworkName,
  policyType,
  companyContext,
  model = MODELS.OPUS,
}: {
  orgId: string;
  frameworkName: string;
  policyType: string;
  companyContext?: string;
  model?: ModelId;
}): Promise<{ policyId: string; content: string; tokensUsed: number; costCents: number }> {
  const anthropic = getAnthropicClient();
  const systemPrompt = getPolicySystemPrompt(frameworkName, policyType);

  // Fetch org profile for context
  const orgProfile = await db.orgProfile.findUnique({
    where: { orgId },
  });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const userMessage = buildPolicyUserMessage({
    companyName: org?.name ?? "[Company Name]",
    industry: orgProfile?.industry ?? undefined,
    companySize: orgProfile?.companySize ?? undefined,
    techStack: (orgProfile?.techStack as string[]) ?? [],
    frameworkName,
    policyType,
    additionalContext: companyContext,
  });

  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    thinking: {
      type: "enabled",
      budget_tokens: 4000,
    },
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const durationMs = Date.now() - startTime;
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costCents = calculateCostCents(model, inputTokens, outputTokens);
  const tokensUsed = inputTokens + outputTokens;

  // Extract the text content
  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n\n");

  // Format the title
  const titleMap: Record<string, string> = {
    information_security: "Information Security Policy",
    access_control: "Access Control Policy",
    incident_response: "Incident Response Plan",
    change_management: "Change Management Policy",
    risk_management: "Risk Management Policy",
    data_protection: "Data Protection Policy",
  };
  const title = `${titleMap[policyType] ?? policyType}, ${frameworkName}`;

  // Save to database
  const policy = await db.generatedPolicy.create({
    data: {
      orgId,
      frameworkName,
      policyType,
      title,
      content,
      modelUsed: model,
      tokensUsed,
      status: "draft",
    },
  });

  // Log AI usage
  await db.aIUsageLog.create({
    data: {
      orgId,
      feature: "policy_generation",
      model,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      costCents,
      durationMs,
    },
  });

  // Increment policy drafts counter
  await db.subscription.updateMany({
    where: { orgId },
    data: { policyDraftsThisMonth: { increment: 1 } },
  });

  return {
    policyId: policy.id,
    content,
    tokensUsed,
    costCents,
  };
}

function buildPolicyUserMessage(params: {
  companyName: string;
  industry?: string;
  companySize?: string;
  techStack: string[];
  frameworkName: string;
  policyType: string;
  additionalContext?: string;
}): string {
  const parts = [
    `Generate a complete ${params.policyType.replace(/_/g, " ")} for ${params.companyName}.`,
    `Framework: ${params.frameworkName}`,
  ];

  if (params.industry) parts.push(`Industry: ${params.industry}`);
  if (params.companySize) parts.push(`Company size: ${params.companySize}`);
  if (params.techStack.length > 0) {
    parts.push(`Tech stack: ${params.techStack.join(", ")}`);
  }
  if (params.additionalContext) {
    parts.push(`Additional context: ${params.additionalContext}`);
  }

  parts.push(
    "Write the full policy document in markdown format. Include all required sections as specified in your instructions."
  );

  return parts.join("\n\n");
}
