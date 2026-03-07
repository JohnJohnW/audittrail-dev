import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Look up the shareable report
  const report = await db.shareableReport.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Check expiry
  if (report.expiresAt && report.expiresAt < new Date()) {
    return NextResponse.json({ error: "This report link has expired" }, { status: 410 });
  }

  const orgId = report.organization.id;

  // Fetch compliance evidence (same as the internal endpoint)
  const evidence = await getComplianceEvidence(orgId);
  const summary = getEvidenceSummary(evidence.controls);

  // Build per-framework scores
  const byFramework = evidence.frameworks.map((f) => {
    const frameworkControls = evidence.controls.filter((c) => c.frameworkName === f.name);
    const fs = getEvidenceSummary(frameworkControls);
    return {
      framework: f.name,
      score: fs.score,
      total: fs.total,
      withEvidence: fs.withEvidence,
    };
  });

  return NextResponse.json({
    orgName: report.organization.name,
    reportTitle: report.title,
    generatedAt: new Date().toISOString(),
    overall: summary.score,
    overallSummary: {
      total: summary.total,
      withEvidence: summary.withEvidence,
      partial: summary.partial,
      limited: summary.limited,
      noEvidence: summary.noEvidence,
    },
    byFramework,
  });
}
