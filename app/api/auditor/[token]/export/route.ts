import { strToU8, zipSync } from "fflate";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getComplianceEvidence } from "@/lib/compliance";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

async function getValidSession(token: string) {
  const session = await db.auditorSession.findUnique({
    where: { token },
    select: {
      id: true,
      orgId: true,
      auditorEmail: true,
      auditorName: true,
      frameworkFilter: true,
      expiresAt: true,
      organization: { select: { name: true } },
    },
  });
  if (!session) throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  if (session.expiresAt < new Date()) throw new AppError("Token has expired", 401, "UNAUTHORIZED");
  return session;
}

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      // Escape double-quotes and wrap in quotes if needed
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

/**
 * GET /api/auditor/[token]/export
 * Streams a ZIP containing:
 *   - README.txt
 *   - summary.csv  - all controls with status + sign-off verdict
 *   - evidence.csv - detailed evidence items
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getValidSession(params.token);

    // Evidence (filtered by framework if set)
    const evidenceResult = await getComplianceEvidence(session.orgId);
    const controls = session.frameworkFilter
      ? evidenceResult.controls.filter((c) => c.frameworkName === session.frameworkFilter)
      : evidenceResult.controls;

    // Sign-offs for this session
    const signoffs = await db.controlSignoff.findMany({
      where: { sessionId: session.id },
    });
    const signoffMap = new Map(signoffs.map((s) => [`${s.controlCode}::${s.frameworkName}`, s]));

    // ---- README.txt ----
    const orgName = session.organization.name;
    const auditorName = session.auditorName ?? session.auditorEmail;
    const now = new Date().toISOString().split("T")[0];
    const readme = [
      `Audit Trail - Evidence Export`,
      `============================`,
      ``,
      `Organisation : ${orgName}`,
      `Framework    : ${session.frameworkFilter ?? "All frameworks"}`,
      `Auditor      : ${auditorName} (${session.auditorEmail})`,
      `Exported     : ${now}`,
      ``,
      `Contents`,
      `--------`,
      `summary.csv  - One row per control with compliance status and auditor verdict`,
      `evidence.csv - Detailed evidence items (commits, PRs, branch settings, etc.)`,
    ].join("\n");

    // ---- summary.csv ----
    const summaryHeader = toCsvRow([
      "Framework",
      "Control Code",
      "Control Title",
      "Status",
      "Evidence Count",
      "Auditor Verdict",
      "Auditor Note",
      "Signed At",
    ]);
    const summaryRows = controls.map((c) => {
      const so = signoffMap.get(`${c.controlCode}::${c.frameworkName}`);
      return toCsvRow([
        c.frameworkName,
        c.controlCode,
        c.controlTitle,
        c.status,
        c.evidenceCount,
        so?.verdict ?? "",
        so?.note ?? "",
        so?.signedAt ? new Date(so.signedAt).toISOString() : "",
      ]);
    });
    const summaryCsv = [summaryHeader, ...summaryRows].join("\n");

    // ---- evidence.csv ----
    const evidenceHeader = toCsvRow([
      "Framework",
      "Control Code",
      "Control Title",
      "Evidence Type",
      "Repository",
      "Description",
      "URL",
      "Date",
    ]);
    const evidenceRows: string[] = [];
    for (const c of controls) {
      for (const item of c.evidence) {
        evidenceRows.push(
          toCsvRow([
            c.frameworkName,
            c.controlCode,
            c.controlTitle,
            item.type,
            item.repositoryFullName ?? item.repositoryName ?? "",
            item.description ?? "",
            item.url ?? "",
            item.timestamp instanceof Date
              ? item.timestamp.toISOString()
              : item.timestamp
                ? new Date(item.timestamp).toISOString()
                : "",
          ])
        );
      }
    }
    const evidenceCsv = [evidenceHeader, ...evidenceRows].join("\n");

    // ---- Build ZIP ----
    const files: Record<string, Uint8Array> = {
      "README.txt": strToU8(readme),
      "summary.csv": strToU8(summaryCsv),
      "evidence.csv": strToU8(evidenceCsv),
    };

    const zipUint8 = zipSync(files, { level: 6 });
    // Convert to Node Buffer for BodyInit compatibility
    const zipBuffer = Buffer.from(zipUint8);

    const filename = `audit-evidence-${now}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
