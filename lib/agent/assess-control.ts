import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, calculateCostCents, type ModelId } from "./anthropic";
import { getToolsForControl } from "./tools";
import { executeToolCall } from "./tool-executor";
import { getAssessmentSystemPrompt } from "./prompts";
import { getControlByCode } from "./control-definitions";
import { db } from "@/lib/db";
import type { AssessmentResult } from "./types";

const MAX_TOOL_ITERATIONS = 8;

/**
 * Assess a single compliance control using the AI agent.
 * This is the core agentic loop, it calls Claude with tools,
 * processes tool_use responses, and loops until the agent finishes.
 */
export async function assessSingleControl({
  orgId,
  agentRunId,
  controlCode,
  frameworkName,
  model,
}: {
  orgId: string;
  agentRunId: string;
  controlCode: string;
  frameworkName: string;
  model: ModelId;
}): Promise<AssessmentResult> {
  const controlDef = getControlByCode(controlCode);
  if (!controlDef) {
    throw new Error(`Unknown control code: ${controlCode}`);
  }

  const anthropic = getAnthropicClient();
  const systemPrompt = getAssessmentSystemPrompt(controlDef, orgId, agentRunId);

  // Get the tools relevant to this control
  const tools = getToolsForControl(controlDef.relevantTools);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Investigate and assess control ${controlCode} (${controlDef.name}) for the ${controlDef.frameworkName} framework. The org ID is "${orgId}" and the agent run ID is "${agentRunId}". Use 90-day lookback for evidence collection. After gathering and analysing evidence, save your assessment using the save_control_assessment tool.`,
    },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let iterations = 0;
  const startTime = Date.now();

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      thinking: {
        type: "enabled",
        budget_tokens: 3000,
      },
      system: systemPrompt,
      tools,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Add assistant response to messages
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "tool_use") {
      // Execute all tool calls and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          try {
            const result = await executeToolCall(
              block.name,
              block.input as Record<string, unknown>
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : "Tool execution failed",
              }),
              is_error: true,
            });
          }
        }
      }

      // Add tool results and continue loop
      messages.push({ role: "user", content: toolResults });
    } else {
      // Agent has finished (stop_reason === 'end_turn')
      break;
    }
  }

  const durationMs = Date.now() - startTime;
  const costCents = calculateCostCents(model, totalInputTokens, totalOutputTokens);

  // Log AI usage
  await db.aIUsageLog.create({
    data: {
      orgId,
      agentRunId,
      feature: "control_assessment",
      model,
      tokensInput: totalInputTokens,
      tokensOutput: totalOutputTokens,
      costCents,
      durationMs,
    },
  });

  // Update agent run token/cost totals
  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      tokensUsed: { increment: totalInputTokens + totalOutputTokens },
      costCents: { increment: costCents },
    },
  });

  // Retrieve the assessment that was saved by the agent via save_control_assessment tool
  const savedAssessment = await db.controlAssessment.findUnique({
    where: {
      agentRunId_controlCode: {
        agentRunId,
        controlCode,
      },
    },
  });

  if (!savedAssessment) {
    // Agent didn't call save_control_assessment, save a fallback
    const fallback = await db.controlAssessment.create({
      data: {
        agentRunId,
        orgId,
        controlCode,
        frameworkName,
        controlName: controlDef.name,
        sufficiencyRating: "not_evidenced",
        confidenceScore: 0.1,
        auditNarrative:
          "The AI agent was unable to complete the assessment for this control. Manual review is required.",
        agentReasoning: `Agent completed ${iterations} iterations but did not call save_control_assessment.`,
        remediationType: "manual",
      },
    });

    await db.agentRun.update({
      where: { id: agentRunId },
      data: {
        controlsAssessed: { increment: 1 },
        controlsInsufficient: { increment: 1 },
      },
    });

    return {
      controlCode,
      frameworkName,
      controlName: controlDef.name,
      sufficiencyRating: "not_evidenced",
      confidenceScore: 0.1,
      auditNarrative: fallback.auditNarrative ?? "",
      tokensUsed: totalInputTokens + totalOutputTokens,
      costCents,
    };
  }

  return {
    controlCode,
    frameworkName,
    controlName: savedAssessment.controlName,
    sufficiencyRating: savedAssessment.sufficiencyRating as AssessmentResult["sufficiencyRating"],
    confidenceScore: savedAssessment.confidenceScore ?? 0,
    auditNarrative: savedAssessment.auditNarrative ?? "",
    agentReasoning: savedAssessment.agentReasoning ?? undefined,
    remediationPlan: savedAssessment.remediationPlan ?? undefined,
    remediationType: savedAssessment.remediationType as AssessmentResult["remediationType"],
    remediationArtifact: savedAssessment.remediationArtifact as Record<string, unknown> | undefined,
    evidenceRecords:
      (savedAssessment.evidenceRecords as Array<{ id: string; type: string; summary: string }>) ??
      [],
    tokensUsed: totalInputTokens + totalOutputTokens,
    costCents,
  };
}
