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

    // Calculate scores by framework
    const byFramework = evidence.frameworks.map((framework) => {
      const frameworkControls = evidence.controls.filter(
        (c) => c.frameworkName === framework.name
      );
      const frameworkSummary = getEvidenceSummary(frameworkControls);
      return {
        framework: framework.name,
        score: frameworkSummary.score,
        total: frameworkSummary.total,
        withEvidence: frameworkSummary.withEvidence,
      };
    });

    // Group by evidence type (category)
    const byCategory = [
      "commit_history",
      "pr_approvals",
      "branch_protection",
    ].map((category) => {
      const categoryControls = evidence.controls.filter(
        (c) => c.evidenceType === category
      );
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
