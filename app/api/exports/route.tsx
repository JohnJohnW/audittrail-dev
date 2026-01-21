import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { renderToBuffer } from "@react-pdf/renderer";
import { ExportPDF } from "@/lib/pdf";
import { isValidCuid, isValidDateString } from "@/lib/utils";

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (!value) return "";
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Check subscription
    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    // Fixed logic: must have pro plan with active status
    const canExport =
      subscription?.plan === "pro" && subscription?.status === "active";

    if (!canExport) {
      return NextResponse.json(
        { error: "Upgrade to Pro to export reports", requiresUpgrade: true },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { format, frameworkId, dateFrom, dateTo, repositoryIds } = body as {
      format: "pdf" | "csv";
      frameworkId?: string;
      dateFrom?: string;
      dateTo?: string;
      repositoryIds?: string[];
    };

    // Validate format
    if (!format || !["pdf", "csv"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // Validate frameworkId if provided
    if (frameworkId && !isValidCuid(frameworkId)) {
      return NextResponse.json({ error: "Invalid frameworkId format" }, { status: 400 });
    }

    // Validate date strings if provided
    if (dateFrom && !isValidDateString(dateFrom)) {
      return NextResponse.json({ error: "Invalid dateFrom format" }, { status: 400 });
    }
    if (dateTo && !isValidDateString(dateTo)) {
      return NextResponse.json({ error: "Invalid dateTo format" }, { status: 400 });
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
        return NextResponse.json({ error: "Invalid repositoryId format in array" }, { status: 400 });
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
        controls = evidence.controls.filter(
          (c) => c.frameworkName === framework.name
        );
        frameworkName = framework.name;
      }
    }

    const now = new Date();
    const fileName = `${frameworkName.replace(/\s+/g, "-")}-Evidence-${
      now.toISOString().split("T")[0]
    }.${format}`;

    // Create export record
    const exportRecord = await db.export.create({
      data: {
        orgId,
        userId: session.user.id,
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
        csvRows.push([
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
        ].join(","));

        // Data rows - one row per evidence item (or one row for controls with no evidence)
        for (const control of controls) {
          if (control.evidence.length === 0) {
            // No evidence - still output the control
            csvRows.push([
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
            ].join(","));
          } else {
            // Output one row per evidence item
            for (const item of control.evidence) {
              csvRows.push([
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
              ].join(","));
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
      console.error("Export generation error:", generateError);
      await db.export.update({
        where: { id: exportRecord.id },
        data: { status: "failed" },
      });
      
      return NextResponse.json(
        { error: "Failed to generate export", details: generateError instanceof Error ? generateError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}

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

    const exports = await db.export.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    return NextResponse.json({
      exports,
      canExport:
        subscription?.plan === "pro" && subscription?.status === "active",
    });
  } catch (error) {
    console.error("Error fetching exports:", error);
    return NextResponse.json(
      { error: "Failed to fetch exports" },
      { status: 500 }
    );
  }
}
