import { db } from "@/lib/db";
import { MODELS, type ModelId } from "./anthropic";
import { CONTROL_DEFINITIONS, getControlsByFramework } from "./control-definitions";
import type { AgentRunConfig, ControlDefinition } from "./types";

/**
 * Create a new agent run and return the controls to assess.
 * Does NOT execute assessments - those are triggered per-control via the API.
 */
export async function createAgentRun(config: AgentRunConfig) {
  const model = config.model ?? MODELS.OPUS;

  // Determine which controls to assess
  let controls: ControlDefinition[];

  if (config.controlCodes && config.controlCodes.length > 0) {
    controls = CONTROL_DEFINITIONS.filter((c) => config.controlCodes!.includes(c.code));
  } else if (config.frameworks && config.frameworks.length > 0) {
    controls = config.frameworks.flatMap((fw) => getControlsByFramework(fw));
  } else {
    controls = [...CONTROL_DEFINITIONS];
  }

  if (controls.length === 0) {
    throw new Error("No controls found matching the specified filters.");
  }

  // Get unique frameworks
  const frameworkSet = new Set(controls.map((c) => c.frameworkName));
  const frameworks = Array.from(frameworkSet);

  // Create the agent run record
  const agentRun = await db.agentRun.create({
    data: {
      orgId: config.orgId,
      triggeredBy: config.triggeredBy,
      triggerEvent: config.triggerEvent,
      status: "pending",
      frameworks,
      modelUsed: model,
    },
  });

  // Increment the org's monthly agent run counter
  await db.subscription.updateMany({
    where: { orgId: config.orgId },
    data: {
      agentRunsThisMonth: { increment: 1 },
    },
  });

  return {
    agentRunId: agentRun.id,
    controls: controls.map((c) => ({
      code: c.code,
      framework: c.framework,
      frameworkName: c.frameworkName,
      name: c.name,
      requiresHumanAction: c.requiresHumanAction,
    })),
    totalControls: controls.length,
    model,
    estimatedCostCents: estimateCost(controls.length, model),
  };
}

/**
 * Mark an agent run as started (running).
 */
export async function startAgentRun(agentRunId: string) {
  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });
}

/**
 * Mark an agent run as completed.
 */
export async function completeAgentRun(agentRunId: string) {
  const run = await db.agentRun.findUnique({
    where: { id: agentRunId },
    select: { controlsAssessed: true },
  });

  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  return run;
}

/**
 * Mark an agent run as failed.
 */
export async function failAgentRun(agentRunId: string, error: string) {
  await db.agentRun.update({
    where: { id: agentRunId },
    data: {
      status: "failed",
      completedAt: new Date(),
      errorMessage: error,
    },
  });
}

/**
 * Estimate the cost of an agent run in cents.
 */
function estimateCost(controlCount: number, model: ModelId): number {
  // Average per-control cost based on typical token usage
  const perControlCents = model === MODELS.OPUS ? 52 : 6;
  return controlCount * perControlCents;
}

/**
 * Check if the org can run the agent (plan limits).
 */
export async function canRunAgent(orgId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const sub = await db.subscription.findFirst({
    where: { orgId },
  });

  if (!sub) {
    return { allowed: false, reason: "No subscription found" };
  }

  // Free plan cannot use agent
  if (sub.plan === "free") {
    return {
      allowed: false,
      reason: "AI Agent requires Starter plan or above",
    };
  }

  // Check monthly limits
  const limits: Record<string, number> = {
    starter: 2,
    pro: 10, // grandfathered pro users
    growth: 10,
    enterprise: Infinity,
  };

  const limit = limits[sub.plan] ?? 0;
  const used = sub.agentRunsThisMonth;

  // Reset counter if it's a new month
  if (sub.agentRunsResetAt && sub.agentRunsResetAt < new Date()) {
    await db.subscription.update({
      where: { id: sub.id },
      data: {
        agentRunsThisMonth: 0,
        agentRunsResetAt: getNextMonthReset(),
      },
    });
    return { allowed: true, remaining: limit };
  }

  // Set reset date if not set
  if (!sub.agentRunsResetAt) {
    await db.subscription.update({
      where: { id: sub.id },
      data: { agentRunsResetAt: getNextMonthReset() },
    });
  }

  const remaining = limit - used;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Monthly agent run limit reached (${limit} runs/month on ${sub.plan} plan)`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

function getNextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
