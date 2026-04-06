/**
 * Agent Assessments API
 *
 * GET: Get latest assessments from the most recent completed agent run,
 *      grouped by framework name.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Find the most recent completed agent run for this org
    const latestRun = await db.agentRun.findFirst({
      where: { orgId, status: "completed" },
      orderBy: { completedAt: "desc" },
      select: { id: true, completedAt: true, frameworks: true },
    });

    if (!latestRun) {
      return NextResponse.json({
        agentRunId: null,
        completedAt: null,
        assessmentsByFramework: {},
      });
    }

    // Fetch all assessments for this run
    const assessments = await db.controlAssessment.findMany({
      where: { agentRunId: latestRun.id },
      orderBy: [{ frameworkName: "asc" }, { controlCode: "asc" }],
    });

    // Group by framework name
    const assessmentsByFramework: Record<string, typeof assessments> = {};
    for (const assessment of assessments) {
      if (!assessmentsByFramework[assessment.frameworkName]) {
        assessmentsByFramework[assessment.frameworkName] = [];
      }
      assessmentsByFramework[assessment.frameworkName].push(assessment);
    }

    return NextResponse.json({
      agentRunId: latestRun.id,
      completedAt: latestRun.completedAt,
      assessmentsByFramework,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
