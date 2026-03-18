/**
 * Full Data Export
 *
 * Generates a comprehensive export of all org data as a ZIP file.
 * Stored in Supabase storage. Download link sent via email.
 */

import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import { getSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface ExportManifest {
  orgId: string;
  orgName: string;
  exportedAt: string;
  sections: string[];
}

/**
 * Generate a full org data export and store in Supabase storage.
 * Returns the storage path for download.
 */
export async function generateFullExport(orgId: string): Promise<{
  storagePath: string;
  manifest: ExportManifest;
}> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  if (!org) throw new Error(`Organization ${orgId} not found`);

  const sections: string[] = [];
  const exportData: Record<string, unknown> = {};

  // 1. Compliance evidence
  const evidence = await getComplianceEvidence(orgId);
  const summary = getEvidenceSummary(evidence.controls);
  exportData.compliance = {
    summary,
    frameworks: evidence.frameworks,
    controls: evidence.controls.map((c) => ({
      controlCode: c.controlCode,
      controlTitle: c.controlTitle,
      frameworkName: c.frameworkName,
      status: c.status,
      evidenceCount: c.evidenceCount,
      evidence: c.evidence.map((e) => ({
        type: e.type,
        title: e.title,
        description: e.description,
        timestamp: e.timestamp.toISOString(),
        url: e.url,
      })),
    })),
  };
  sections.push("compliance");

  // 2. Compliance snapshots (trend data)
  const snapshots = await db.complianceSnapshot.findMany({
    where: { orgId },
    orderBy: { snapshotDate: "asc" },
  });
  exportData.snapshots = snapshots;
  sections.push("snapshots");

  // 3. Risk treatments
  const treatments = await db.riskTreatment.findMany({
    where: { orgId },
    include: {
      owner: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  exportData.riskTreatments = treatments;
  sections.push("risk_treatments");

  // 4. Gap assignments
  const gaps = await db.gapAssignment.findMany({
    where: { orgId },
    include: {
      assignee: { select: { name: true, email: true } },
      assignedBy: { select: { name: true, email: true } },
    },
  });
  exportData.gapAssignments = gaps;
  sections.push("gap_assignments");

  // 5. Audit cycles + findings
  const auditCycles = await db.auditCycle.findMany({
    where: { orgId },
    include: {
      findings: true,
      requests: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
  exportData.auditCycles = auditCycles;
  sections.push("audit_cycles");

  // 6. Control notes
  const notes = await db.controlNote.findMany({
    where: { orgId },
  });
  exportData.controlNotes = notes;
  sections.push("control_notes");

  // 7. Alerts
  const alerts = await db.complianceAlert.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  exportData.alerts = alerts;
  sections.push("alerts");

  // Build manifest
  const manifest: ExportManifest = {
    orgId,
    orgName: org.name,
    exportedAt: new Date().toISOString(),
    sections,
  };
  exportData.manifest = manifest;

  // Compress and upload using fflate
  const { strToU8, zipSync } = await import("fflate");

  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  };

  for (const section of sections) {
    const data = exportData[section];
    files[`${section}.json`] = strToU8(JSON.stringify(data, null, 2));
  }

  const zipped = zipSync(files);

  // Upload to Supabase storage
  const storagePath = `exports/${orgId}/${Date.now()}-export.zip`;
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from("evidence-uploads").upload(storagePath, zipped, {
    contentType: "application/zip",
    upsert: false,
  });

  if (error) {
    logger.error("Export upload failed", { error: error.message });
    throw new Error(`Export upload failed: ${error.message}`);
  }

  return { storagePath, manifest };
}
