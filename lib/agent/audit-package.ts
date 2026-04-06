import { db } from "@/lib/db";
import { getAnthropicClient, calculateCostCents, MODELS, type ModelId } from "./anthropic";

/**
 * Assemble a structured audit package from a completed agent run.
 * Returns a JSON structure ready for PDF rendering or export.
 */
export async function assembleAuditPackage({
  orgId,
  agentRunId,
  model = MODELS.OPUS,
}: {
  orgId: string;
  agentRunId: string;
  model?: ModelId;
}) {
  // Fetch the agent run
  const agentRun = await db.agentRun.findUnique({
    where: { id: agentRunId },
  });
  if (!agentRun) throw new Error("Agent run not found");
  if (agentRun.orgId !== orgId) throw new Error("Unauthorized");
  if (agentRun.status !== "completed") {
    throw new Error("Agent run is not completed");
  }

  // Fetch all assessments for this run
  const assessments = await db.controlAssessment.findMany({
    where: { agentRunId },
    orderBy: [{ frameworkName: "asc" }, { controlCode: "asc" }],
  });

  // Fetch human tasks for the org
  const humanTasks = await db.humanTask.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch risk treatments
  const riskTreatments = await db.riskTreatment.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch approved policies
  const policies = await db.generatedPolicy.findMany({
    where: { orgId, status: "approved" },
    orderBy: { createdAt: "desc" },
  });

  // Fetch org profile
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true, slug: true },
  });

  // Generate cover letter
  const coverLetter = await generateCoverLetter({
    orgName: org?.name ?? "Organisation",
    agentRun,
    model,
    orgId,
  });

  // Group assessments by framework
  const assessmentsByFramework: Record<string, typeof assessments> = {};
  for (const a of assessments) {
    if (!assessmentsByFramework[a.frameworkName]) {
      assessmentsByFramework[a.frameworkName] = [];
    }
    assessmentsByFramework[a.frameworkName].push(a);
  }

  // Build gap register
  const gaps = assessments
    .filter(
      (a) => a.sufficiencyRating === "insufficient" || a.sufficiencyRating === "not_evidenced"
    )
    .map((a) => ({
      controlCode: a.controlCode,
      controlName: a.controlName,
      framework: a.frameworkName,
      rating: a.sufficiencyRating,
      remediationPlan: a.remediationPlan,
      remediationType: a.remediationType,
    }));

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      agentRunId,
      organisationName: org?.name,
      frameworks: agentRun.frameworks,
      modelUsed: agentRun.modelUsed,
      assessmentPeriod: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
    },
    summary: {
      totalControls: agentRun.controlsAssessed,
      sufficient: agentRun.controlsSufficient,
      partial: agentRun.controlsPartial,
      insufficient: agentRun.controlsInsufficient,
      notEvidenced:
        agentRun.controlsAssessed -
        agentRun.controlsSufficient -
        agentRun.controlsPartial -
        agentRun.controlsInsufficient,
    },
    coverLetter,
    assessmentsByFramework,
    gapRegister: gaps,
    humanTasks: humanTasks.map((t) => ({
      title: t.title,
      controlCode: t.controlCode,
      framework: t.frameworkName,
      taskType: t.taskType,
      status: t.status,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
    })),
    riskTreatments: riskTreatments.map((r) => ({
      controlCode: r.controlCode,
      framework: r.frameworkName,
      treatmentType: r.treatmentType,
      status: r.status,
      rationale: r.rationale,
    })),
    policies: policies.map((p) => ({
      title: p.title,
      framework: p.frameworkName,
      policyType: p.policyType,
      status: p.status,
    })),
  };
}

async function generateCoverLetter({
  orgName,
  agentRun,
  model,
  orgId,
}: {
  orgName: string;
  agentRun: {
    controlsAssessed: number;
    controlsSufficient: number;
    controlsPartial: number;
    controlsInsufficient: number;
    frameworks: string[];
  };
  model: ModelId;
  orgId: string;
}): Promise<string> {
  const anthropic = getAnthropicClient();

  const prompt = `Write a 2-3 paragraph cover letter for an audit evidence package for ${orgName}.

Key facts:
- Frameworks assessed: ${agentRun.frameworks.join(", ")}
- Total controls assessed: ${agentRun.controlsAssessed}
- Sufficient: ${agentRun.controlsSufficient}
- Partial: ${agentRun.controlsPartial}
- Insufficient/Not Evidenced: ${agentRun.controlsInsufficient}
- Assessment methodology: NIST SP 800-53A Rev 5
- Evidence sources: GitHub (commits, PRs, reviews, branch protection, CI/CD, deployments)
- Assessment period: last 90 days

Write in professional audit tone. Address it to "The Audit Team". Do not include a greeting or sign-off. Just the body paragraphs.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  // Log usage
  await db.aIUsageLog.create({
    data: {
      orgId,
      feature: "audit_package",
      model,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      costCents: calculateCostCents(
        model,
        response.usage.input_tokens,
        response.usage.output_tokens
      ),
    },
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n\n");
}
