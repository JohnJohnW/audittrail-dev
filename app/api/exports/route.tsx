import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, canExport as checkCanExport, parseJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { renderToBuffer } from "@react-pdf/renderer";
import { ExportPDF } from "@/lib/pdf";
import { isValidCuid, isValidDateString } from "@/lib/utils";
import { handleApiError, AppError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { EXPORT_CONFIG } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

// Helper to escape CSV values safely.
// Prevents CSV formula injection: Excel/Sheets treat cells starting with =, +, -, @, tab, or
// carriage-return as formulas. We prefix those with a single-quote so they render as plain text.
function escapeCSV(value: string): string {
  if (!value) return "";
  // Neutralise formula injection characters at the start of a value
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  // Wrap in double-quotes if the value contains commas, quotes, newlines, or the injected apostrophe
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.startsWith("'")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface ExportBody {
  format?: "pdf" | "csv";
  framework?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireAuth();

    // Rate-limit exports per org (10/hour - enforced after auth so we use orgId as key)
    const { success: withinLimit } = await checkRateLimit(orgId, "export");
    if (!withinLimit) {
      throw new AppError("Export rate limit reached - try again later", 429, "RATE_LIMITED");
    }

    // Check subscription
    const canExport = await checkCanExport(orgId);

    if (!canExport) {
      throw new AppError("Upgrade to Pro to export reports", 403, "SUBSCRIPTION_REQUIRED");
    }

    const body = await parseJsonBody<ExportBody>(request);

    const { format, frameworkId, dateFrom, dateTo, repositoryIds } = body as {
      format: "pdf" | "csv";
      frameworkId?: string;
      dateFrom?: string;
      dateTo?: string;
      repositoryIds?: string[];
    };

    // Validate format
    if (!format || !["pdf", "csv"].includes(format)) {
      throw new AppError("Invalid format", 400, "INVALID_FORMAT");
    }

    // Validate frameworkId if provided
    if (frameworkId && !isValidCuid(frameworkId)) {
      throw new AppError("Invalid frameworkId format", 400, "INVALID_ID");
    }

    // Validate date strings if provided
    if (dateFrom && !isValidDateString(dateFrom)) {
      throw new AppError("Invalid dateFrom format", 400, "INVALID_DATE");
    }
    if (dateTo && !isValidDateString(dateTo)) {
      throw new AppError("Invalid dateTo format", 400, "INVALID_DATE");
    }

    // Validate date range logic
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (fromDate > toDate) {
        return NextResponse.json({ error: "dateFrom must be before dateTo" }, { status: 400 });
      }
    }

    // Validate repositoryIds if provided
    if (repositoryIds) {
      if (!Array.isArray(repositoryIds)) {
        return NextResponse.json({ error: "repositoryIds must be an array" }, { status: 400 });
      }
      if (repositoryIds.some((id) => typeof id !== "string" || !isValidCuid(id))) {
        return NextResponse.json(
          { error: "Invalid repositoryId format in array" },
          { status: 400 }
        );
      }
    }

    // Get organization
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    // Get evidence with filters
    const evidenceOptions = {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      repositoryIds,
    };
    const evidence = await getComplianceEvidence(orgId, evidenceOptions);
    const summary = getEvidenceSummary(evidence.controls);

    // Filter by framework if specified
    let controls = evidence.controls;
    let frameworkName = "All Frameworks";

    if (frameworkId) {
      const framework = evidence.frameworks.find((f) => f.id === frameworkId);
      if (framework) {
        controls = evidence.controls.filter((c) => c.frameworkName === framework.name);
        frameworkName = framework.name;
      }
    }

    const now = new Date();
    // Sanitise frameworkName before using in a filename: strip everything except
    // alphanumerics, spaces, and hyphens, then collapse whitespace to hyphens.
    const safeFrameworkName = frameworkName
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 64);
    const fileName = `${safeFrameworkName}-Evidence-${now.toISOString().split("T")[0]}.${format}`;

    // Create export record
    const exportRecord = await db.export.create({
      data: {
        orgId,
        userId,
        type: format,
        frameworkId: frameworkId || null,
        fileName,
        status: "pending",
      },
    });

    let buffer: Buffer;
    let contentType: string;

    try {
      // Get repository names for the report
      const selectedRepoNames = repositoryIds?.length
        ? await db.repository
            .findMany({
              where: { id: { in: repositoryIds } },
              select: { fullName: true },
            })
            .then((repos) => repos.map((r) => r.fullName))
        : undefined;

      if (format === "pdf") {
        // Generate PDF with date range and repository info
        buffer = await renderToBuffer(
          <ExportPDF
            orgName={org?.name || "Organization"}
            frameworkName={frameworkName}
            generatedAt={now}
            summary={summary}
            controls={controls}
            dateRange={{
              from: dateFrom ? new Date(dateFrom) : undefined,
              to: dateTo ? new Date(dateTo) : undefined,
            }}
            repositories={selectedRepoNames}
          />
        );
        contentType = "application/pdf";
      } else {
        // Generate comprehensive CSV with evidence details
        const csvRows: string[] = [];

        // Header row
        csvRows.push(
          [
            "Control Code",
            "Control Title",
            "Framework",
            "Status",
            "Evidence Count",
            "Evidence Type",
            "Evidence Title",
            "Evidence Description",
            "Evidence Timestamp",
            "Evidence URL",
            "Evidence Relevance",
            "Repository",
          ].join(",")
        );

        // Data rows - one row per evidence item (or one row for controls with no evidence)
        for (const control of controls) {
          if (control.evidence.length === 0) {
            // No evidence - still output the control
            csvRows.push(
              [
                escapeCSV(control.controlCode),
                escapeCSV(control.controlTitle),
                escapeCSV(control.frameworkName),
                escapeCSV(control.status),
                "0",
                escapeCSV(control.evidenceType),
                "",
                "",
                "",
                "",
                "",
                "",
              ].join(",")
            );
          } else {
            // Output one row per evidence item
            for (const item of control.evidence) {
              csvRows.push(
                [
                  escapeCSV(control.controlCode),
                  escapeCSV(control.controlTitle),
                  escapeCSV(control.frameworkName),
                  escapeCSV(control.status),
                  String(control.evidenceCount),
                  escapeCSV(control.evidenceType),
                  escapeCSV(item.title),
                  escapeCSV(item.description),
                  new Date(item.timestamp).toISOString(),
                  escapeCSV(item.url || ""),
                  escapeCSV((item as { relevance?: string }).relevance || ""),
                  escapeCSV((item as { repositoryFullName?: string }).repositoryFullName || ""),
                ].join(",")
              );
            }
          }
        }

        buffer = Buffer.from(csvRows.join("\n"), "utf-8");
        contentType = "text/csv";
      }

      // Update export record to completed
      await db.export.update({
        where: { id: exportRecord.id },
        data: { status: "completed" },
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (generateError) {
      // Update export record to failed
      logger.error("Export generation error", generateError);
      await db.export.update({
        where: { id: exportRecord.id },
        data: { status: "failed" },
      });

      return NextResponse.json(
        {
          error: "Failed to generate export",
          details: generateError instanceof Error ? generateError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Export error", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    const exports = await db.export.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: EXPORT_CONFIG.MAX_EXPORTS_PER_PAGE,
    });

    const canExportResult = await checkCanExport(orgId);

    return NextResponse.json({
      exports,
      canExport: canExportResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
