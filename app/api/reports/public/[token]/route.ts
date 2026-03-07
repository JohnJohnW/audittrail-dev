import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getComplianceEvidence,
  getEvidenceSummary,
  calculateFrameworkScores,
} from "@/lib/compliance";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Rate-limit by IP — public endpoint, no auth required
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success } = await checkRateLimit(ip, "api");
    if (!success) {
      throw new AppError("Too many requests", 429, "RATE_LIMITED");
    }

    const { token } = params;

    if (!token) {
      throw new AppError("Invalid token", 400, "INVALID_TOKEN");
    }

    // Look up the shareable report
    const report = await db.shareableReport.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!report) {
      throw new AppError("Report not found", 404, "NOT_FOUND");
    }

    // Check expiry
    if (report.expiresAt && report.expiresAt < new Date()) {
      throw new AppError("This report link has expired", 410, "EXPIRED");
    }

    const orgId = report.organization.id;

    // Fetch compliance evidence (same as the internal endpoint)
    const evidence = await getComplianceEvidence(orgId);
    const summary = getEvidenceSummary(evidence.controls);

    // Build per-framework scores (shared helper — O(n) grouping)
    const byFramework = calculateFrameworkScores(evidence);

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
  } catch (error) {
    return handleApiError(error);
  }
}
