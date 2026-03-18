/**
 * Risk Treatment Management
 *
 * Auto-closure logic: after sync, checks if open "remediate" treatments
 * now have evidence and auto-closes them.
 */

import { db } from "@/lib/db";
import { getComplianceEvidence } from "@/lib/compliance";
import { logger } from "@/lib/logger";

/**
 * Check open remediate treatments and auto-close any that now have evidence.
 */
export async function checkAutoCloseRiskTreatments(orgId: string): Promise<number> {
  const openTreatments = await db.riskTreatment.findMany({
    where: {
      orgId,
      status: { in: ["open", "in_progress"] },
      treatmentType: "remediate",
    },
  });

  if (openTreatments.length === 0) return 0;

  const evidence = await getComplianceEvidence(orgId);
  let closedCount = 0;

  for (const treatment of openTreatments) {
    const control = evidence.controls.find(
      (c) => c.controlCode === treatment.controlCode && c.frameworkName === treatment.frameworkName
    );

    if (control && control.status === "has_evidence") {
      await db.riskTreatment.update({
        where: { id: treatment.id },
        data: {
          status: "closed",
          closedAt: new Date(),
          closedByEvidence: `Auto-closed: control ${treatment.controlCode} now has evidence`,
        },
      });
      closedCount++;
      logger.info(`Auto-closed risk treatment for ${treatment.controlCode}`, {
        orgId,
        treatmentId: treatment.id,
      });
    }
  }

  return closedCount;
}

/**
 * Detect stale risk acceptances: accepted treatments with reviewDate within 30 days.
 */
export async function detectStaleRiskAcceptances(
  orgId: string
): Promise<Array<{ id: string; controlCode: string; frameworkName: string; reviewDate: Date }>> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const stale = await db.riskTreatment.findMany({
    where: {
      orgId,
      treatmentType: "accept",
      status: { not: "closed" },
      reviewDate: {
        lte: thirtyDaysFromNow,
      },
    },
    select: {
      id: true,
      controlCode: true,
      frameworkName: true,
      reviewDate: true,
    },
  });

  return stale.filter((t) => t.reviewDate !== null) as Array<{
    id: string;
    controlCode: string;
    frameworkName: string;
    reviewDate: Date;
  }>;
}
