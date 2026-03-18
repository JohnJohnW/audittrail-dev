/**
 * Zero Trust Architecture (ZTA) Dashboard API
 *
 * GET: ZTA posture grouped by pillar, cross-mapping NIST SP 800-207,
 * ASD MDA Foundations, and related framework controls.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ZTA pillar → control code prefix mapping
const ZTA_PILLAR_CONTROLS: Record<string, string[]> = {
  identity: [
    "ZTA-ID",
    "ZTA-T5",
    "MDA-F1",
    "MDA-F2",
    "MDA-F3",
    "SOC2-CC6.1",
    "SOC2-CC6.2",
    "SOC2-CC6.3",
    "800-53-AC-2",
  ],
  device: ["MDA-F4", "MDA-F5", "ZTA-CDM", "ZTA-T4"],
  application: [
    "ZTA-T1",
    "ZTA-PE",
    "MDA-F6",
    "MDA-F8",
    "800-53-SA-10",
    "800-53-SA-11",
    "SOC2-CC8.1",
  ],
  data: ["ZTA-T2", "ZTA-T3", "MDA-F9", "GDPR-Art25", "GDPR-Art32"],
  network: ["MDA-F7", "ZTA-T2"],
  visibility: ["ZTA-T6", "ZTA-TI", "MDA-F10", "800-53-CA-7", "SOC2-CC7.1", "SOC2-CC7.2"],
};

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Get latest compliance snapshot
    const snapshot = await db.complianceSnapshot.findFirst({
      where: { orgId },
      orderBy: { snapshotDate: "desc" },
    });

    // Get all controls across ZTA-relevant frameworks
    const controls = await db.complianceControl.findMany({
      where: {
        framework: {
          name: {
            in: ["NIST SP 800-207", "ASD MDA Foundations", "SOC 2", "NIST SP 800-53 Rev 5", "GDPR"],
          },
        },
      },
      include: { framework: true },
    });

    // Build pillar coverage summary
    const pillars = Object.entries(ZTA_PILLAR_CONTROLS).map(([pillar, controlCodes]) => {
      const pillarControls = controls.filter((c) =>
        controlCodes.some((code) => c.code.startsWith(code) || c.code === code)
      );
      return {
        pillar,
        totalControls: pillarControls.length,
        controls: pillarControls.map((c) => ({
          code: c.code,
          title: c.title,
          framework: c.framework.name,
          evidenceType: c.evidenceType,
        })),
      };
    });

    return NextResponse.json({
      orgId,
      snapshotDate: snapshot?.createdAt ?? null,
      pillars,
      frameworks: ["NIST SP 800-207", "ASD MDA Foundations"],
      dataSourcesNeeded: {
        identity: ["Identity Provider (Okta, Azure AD, Google Workspace)"],
        device: ["MDM (Jamf, Intune)", "EDR (CrowdStrike, SentinelOne)"],
        network: ["ZTNA (Cloudflare Access, Zscaler)", "Firewall logs"],
        visibility: ["SIEM (Splunk, Datadog)", "Cloud SIEM"],
        application: ["GitHub (connected ✓)", "CI/CD pipelines"],
        data: ["DLP tools", "Data classification platform"],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
