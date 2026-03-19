import { db } from "./db";
import { logger } from "./logger";

// Status rank - higher = better
const STATUS_RANK: Record<string, number> = {
  has_evidence: 3,
  partial: 2,
  limited: 1,
  no_evidence: 0,
};

/**
 * Compare today's per-control snapshots against the most recent prior day
 * and record any controls whose status improved (remediation events).
 *
 * Called non-blocking from storeComplianceSnapshot() in the cron route.
 */
export async function detectRemediationEvents(orgId: string): Promise<void> {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Today's per-control snapshots (written moments before this call)
    const todaySnapshots = await db.controlStatusSnapshot.findMany({
      where: { orgId, snapshotDate: today },
      select: { controlCode: true, frameworkName: true, status: true },
    });

    if (todaySnapshots.length === 0) return;

    // Find the most recent prior snapshot date
    const priorSnapshot = await db.controlStatusSnapshot.findFirst({
      where: { orgId, snapshotDate: { lt: today } },
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true },
    });

    if (!priorSnapshot) return; // Need at least 2 days of history

    const priorDate = priorSnapshot.snapshotDate;

    // Load all controls from that prior date
    const priorSnapshots = await db.controlStatusSnapshot.findMany({
      where: { orgId, snapshotDate: priorDate },
      select: { controlCode: true, frameworkName: true, status: true },
    });

    const priorByKey = new Map<string, string>();
    for (const s of priorSnapshots) {
      priorByKey.set(`${s.controlCode}|${s.frameworkName}`, s.status);
    }

    // daysToFix = calendar days between the prior snapshot and today
    const daysToFix = Math.round((today.getTime() - priorDate.getTime()) / (1000 * 60 * 60 * 24));

    // Already recorded remediations for today (avoid double-writing if cron runs twice)
    const startOfToday = today;
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const existingToday = await db.remediationEvent.findMany({
      where: { orgId, detectedAt: { gte: startOfToday, lt: endOfToday } },
      select: { controlCode: true, frameworkName: true },
    });
    const alreadyDone = new Set(existingToday.map((e) => `${e.controlCode}|${e.frameworkName}`));

    // Collect improvements not yet recorded today
    const remediations: {
      orgId: string;
      controlCode: string;
      frameworkName: string;
      fromStatus: string;
      toStatus: string;
      daysToFix: number | null;
    }[] = [];

    for (const snap of todaySnapshots) {
      const key = `${snap.controlCode}|${snap.frameworkName}`;
      if (alreadyDone.has(key)) continue;

      const priorStatus = priorByKey.get(key);
      if (!priorStatus) continue;

      const prevRank = STATUS_RANK[priorStatus] ?? 0;
      const currRank = STATUS_RANK[snap.status] ?? 0;

      if (currRank > prevRank) {
        remediations.push({
          orgId,
          controlCode: snap.controlCode,
          frameworkName: snap.frameworkName,
          fromStatus: priorStatus,
          toStatus: snap.status,
          daysToFix: daysToFix > 0 ? daysToFix : null,
        });
      }
    }

    if (remediations.length === 0) return;

    await db.remediationEvent.createMany({ data: remediations });

    logger.info(`Detected ${remediations.length} remediation events for org ${orgId}`, {
      orgId,
      count: remediations.length,
    });
  } catch (error) {
    logger.error(`Error detecting remediation events for org ${orgId}`, error);
    // Non-blocking - caller should not propagate this
  }
}
