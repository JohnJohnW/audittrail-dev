import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    // Pre-group controls by framework for O(n) instead of O(n*m) filtering
    const controlsByFramework = new Map<string, typeof evidence.controls>();
    for (const control of evidence.controls) {
      const existing = controlsByFramework.get(control.frameworkName) || [];
      existing.push(control);
      controlsByFramework.set(control.frameworkName, existing);
    }

    // Pre-group controls by evidence type for O(n) instead of O(n*m) filtering
    const controlsByCategory = new Map<string, typeof evidence.controls>();
    for (const control of evidence.controls) {
      const existing = controlsByCategory.get(control.evidenceType) || [];
      existing.push(control);
      controlsByCategory.set(control.evidenceType, existing);
    }

    // Calculate scores by framework using pre-grouped data
    const byFramework = evidence.frameworks.map((framework) => {
      const frameworkControls = controlsByFramework.get(framework.name) || [];
      const frameworkSummary = getEvidenceSummary(frameworkControls);
      return {
        framework: framework.name,
        score: frameworkSummary.score,
        total: frameworkSummary.total,
        withEvidence: frameworkSummary.withEvidence,
      };
    });

    // Calculate scores by category using pre-grouped data
    const categories = ["commit_history", "pr_approvals", "branch_protection"];
    const byCategory = categories.map((category) => {
      const categoryControls = controlsByCategory.get(category) || [];
      const categorySummary = getEvidenceSummary(categoryControls);
      return {
        category: category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        score: categorySummary.score,
      };
    });

    return NextResponse.json({
      overall: summary.score,
      byFramework,
      byCategory,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
