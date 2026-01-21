import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { renderToBuffer } from "@react-pdf/renderer";
import { ExportPDF } from "@/lib/pdf";

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

    const { format, frameworkId } = body as {
      format: "pdf" | "csv";
      frameworkId?: string;
    };

    if (!format || !["pdf", "csv"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // Get organization
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    // Get evidence
    const evidence = await getComplianceEvidence(orgId);
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

    if (format === "pdf") {
      // Generate PDF
      buffer = await renderToBuffer(
        <ExportPDF
          orgName={org?.name || "Organization"}
          frameworkName={frameworkName}
          generatedAt={now}
          summary={summary}
          controls={controls}
        />
      );
      contentType = "application/pdf";
    } else {
      // Generate CSV
      const csvRows = [
        [
          "Control Code",
          "Control Title",
          "Framework",
          "Status",
          "Evidence Count",
          "Evidence Type",
        ].join(","),
        ...controls.map((control) =>
          [
            control.controlCode,
            `"${control.controlTitle.replace(/"/g, '""')}"`,
            control.frameworkName,
            control.status,
            control.evidenceCount,
            control.evidenceType,
          ].join(",")
        ),
      ];
      buffer = Buffer.from(csvRows.join("\n"), "utf-8");
      contentType = "text/csv";
    }

    // Update export record
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
