/**
 * Compliance Alert Detection
 *
 * Analyses changes between sync cycles and creates ComplianceAlert records when
 * compliance posture degrades. Called by the cron sync route after each snapshot.
 */

import { db } from "./db";
import { logger } from "./logger";
import { getOrgNotificationPreferences } from "./notifications";
import { escapeHtml } from "./utils";

// Alert type constants
export const ALERT_TYPE = {
  SCORE_DROP: "score_drop",
  CONTROL_REGRESSION: "control_regression",
  BRANCH_PROTECTION_WEAKENED: "branch_protection_weakened",
  PR_NO_REVIEW: "pr_no_review",
} as const;

export type AlertType = (typeof ALERT_TYPE)[keyof typeof ALERT_TYPE];

// Severity thresholds
const SCORE_DROP_HIGH = 10; // points
const SCORE_DROP_MEDIUM = 5; // points
const NO_EVIDENCE_INCREASE_THRESHOLD = 2; // controls

/** Main entry point — called after storeComplianceSnapshot() in cron route */
export async function detectAndCreateAlerts(
  orgId: string,
  repositories: Array<{
    id: string;
    fullName: string;
    defaultBranch: string;
    lastSyncedAt: Date | null;
  }>
): Promise<void> {
  try {
    // Fetch two most recent snapshots for comparison
    const snapshots = await db.complianceSnapshot.findMany({
      where: { orgId },
      orderBy: { snapshotDate: "desc" },
      take: 2,
    });

    const [currentSnapshot, previousSnapshot] = snapshots;

    if (!currentSnapshot) return; // Nothing to compare yet

    await Promise.allSettled([
      previousSnapshot && detectScoreDrop(orgId, previousSnapshot, currentSnapshot),
      previousSnapshot && detectControlRegressions(orgId, previousSnapshot, currentSnapshot),
      detectBranchProtectionChanges(orgId, repositories),
      detectPRsMergedWithoutReviews(orgId, repositories),
    ]);
  } catch (error) {
    // Alert detection failures must never break the cron sync
    logger.warn("Alert detection failed for org", { orgId, error: String(error) });
  }
}

// ============================================================
// Detection functions
// ============================================================

async function detectScoreDrop(
  orgId: string,
  prev: { overallScore: number; frameworkScores: unknown },
  curr: { overallScore: number; frameworkScores: unknown }
): Promise<void> {
  const drop = prev.overallScore - curr.overallScore;

  if (drop >= SCORE_DROP_MEDIUM) {
    const severity = drop >= SCORE_DROP_HIGH ? "high" : "medium";
    await createAlert(orgId, {
      type: ALERT_TYPE.SCORE_DROP,
      severity,
      title: `Compliance score dropped by ${drop} point${drop !== 1 ? "s" : ""}`,
      description: `Your overall compliance score fell from ${prev.overallScore}% to ${curr.overallScore}%. Review recent changes to understand what caused the regression.`,
      metadata: { previousScore: prev.overallScore, currentScore: curr.overallScore, drop },
      dedupeKey: `score_drop:${orgId}`,
    });
  }

  // Check per-framework drops
  const prevFrameworks = prev.frameworkScores as Record<
    string,
    { score: number; total: number; withEvidence: number }
  > | null;
  const currFrameworks = curr.frameworkScores as Record<
    string,
    { score: number; total: number; withEvidence: number }
  > | null;

  if (prevFrameworks && currFrameworks) {
    for (const [framework, prevData] of Object.entries(prevFrameworks)) {
      const currData = currFrameworks[framework];
      if (!currData) continue;
      const frameworkDrop = prevData.score - currData.score;
      if (frameworkDrop >= SCORE_DROP_HIGH) {
        await createAlert(orgId, {
          type: ALERT_TYPE.SCORE_DROP,
          severity: "high",
          title: `${framework} compliance score dropped by ${frameworkDrop} points`,
          description: `Your ${framework} score fell from ${prevData.score}% to ${currData.score}%. Review evidence gaps for this framework.`,
          metadata: {
            framework,
            previousScore: prevData.score,
            currentScore: currData.score,
            drop: frameworkDrop,
          },
          dedupeKey: `score_drop:${orgId}:${framework}`,
        });
      }
    }
  }
}

async function detectControlRegressions(
  orgId: string,
  prev: { overallScore: number; noEvidence: number },
  curr: { overallScore: number; noEvidence: number }
): Promise<void> {
  const noEvidenceIncrease = curr.noEvidence - prev.noEvidence;
  if (noEvidenceIncrease >= NO_EVIDENCE_INCREASE_THRESHOLD) {
    await createAlert(orgId, {
      type: ALERT_TYPE.CONTROL_REGRESSION,
      severity: "medium",
      title: `${noEvidenceIncrease} control${noEvidenceIncrease !== 1 ? "s" : ""} lost evidence coverage`,
      description: `${noEvidenceIncrease} control${noEvidenceIncrease !== 1 ? "s" : ""} that previously had evidence now show no evidence. This may be caused by stale commit history falling outside the analysis window.`,
      metadata: {
        previousNoEvidence: prev.noEvidence,
        currentNoEvidence: curr.noEvidence,
        increase: noEvidenceIncrease,
      },
      dedupeKey: `regression:${orgId}`,
    });
  }
}

async function detectBranchProtectionChanges(
  orgId: string,
  repositories: Array<{ id: string; fullName: string; defaultBranch: string }>
): Promise<void> {
  for (const repo of repositories) {
    try {
      // Get two most recent branch protection snapshots for the default branch
      const snapshots = await db.branchProtection.findMany({
        where: { repoId: repo.id, branch: repo.defaultBranch },
        orderBy: { snapshotAt: "desc" },
        take: 2,
      });

      const [current, previous] = snapshots;
      if (!current || !previous) continue;

      // Detect PR requirement being removed — critical
      if (previous.requirePullRequest && !current.requirePullRequest) {
        await createAlert(orgId, {
          type: ALERT_TYPE.BRANCH_PROTECTION_WEAKENED,
          severity: "critical",
          title: `Branch protection removed on ${repo.fullName}`,
          description: `The default branch (${repo.defaultBranch}) of ${repo.fullName} no longer requires pull requests before merging. This significantly weakens your change management controls.`,
          metadata: {
            repository: repo.fullName,
            branch: repo.defaultBranch,
            change: "require_pull_request_disabled",
          },
          dedupeKey: `branch_protection:${repo.id}:pr_required`,
        });
      } else {
        // Calculate protection score change
        const prevScore = calcProtectionScore(previous);
        const currScore = calcProtectionScore(current);
        if (prevScore > currScore) {
          await createAlert(orgId, {
            type: ALERT_TYPE.BRANCH_PROTECTION_WEAKENED,
            severity: "high",
            title: `Branch protection weakened on ${repo.fullName}`,
            description: `Branch protection rules for ${repo.defaultBranch} in ${repo.fullName} have been reduced (score: ${prevScore} → ${currScore}). Review your branch protection settings.`,
            metadata: {
              repository: repo.fullName,
              branch: repo.defaultBranch,
              previousScore: prevScore,
              currentScore: currScore,
            },
            dedupeKey: `branch_protection:${repo.id}:weakened`,
          });
        }
      }
    } catch (err) {
      logger.warn(`Branch protection check failed for repo ${repo.id}`, { error: String(err) });
    }
  }
}

async function detectPRsMergedWithoutReviews(
  orgId: string,
  repositories: Array<{
    id: string;
    fullName: string;
    defaultBranch: string;
    lastSyncedAt: Date | null;
  }>
): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const repo of repositories) {
    try {
      // Find PRs merged to default branch in the last 24h with no APPROVED reviews
      const prsWithoutApproval = await db.pullRequest.findMany({
        where: {
          repoId: repo.id,
          baseBranch: repo.defaultBranch,
          state: "merged",
          mergedAt: { gte: oneDayAgo },
        },
        include: {
          reviews: {
            where: { state: "APPROVED" },
            select: { id: true },
          },
        },
      });

      const unreviewed = prsWithoutApproval.filter((pr) => pr.reviews.length === 0);

      for (const pr of unreviewed) {
        await createAlert(orgId, {
          type: ALERT_TYPE.PR_NO_REVIEW,
          severity: "high",
          title: `PR merged without approval in ${repo.fullName}`,
          description: `Pull request "${pr.title}" (#${pr.number}) was merged to ${repo.defaultBranch} without any approved reviews. This may affect your PR approval controls.`,
          metadata: {
            repository: repo.fullName,
            prNumber: pr.number,
            prTitle: pr.title,
            prUrl: pr.url,
            mergedAt: pr.mergedAt?.toISOString(),
          },
          dedupeKey: `pr_no_review:${pr.id}`,
        });
      }
    } catch (err) {
      logger.warn(`PR review check failed for repo ${repo.id}`, { error: String(err) });
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function calcProtectionScore(bp: {
  requirePullRequest: boolean;
  requiredApprovals: number;
  dismissStaleReviews: boolean;
  requireCodeOwners: boolean;
  enforceAdmins: boolean;
  requireStatusChecks: boolean;
}): number {
  let score = 0;
  if (bp.requirePullRequest) score += 2;
  if (bp.requiredApprovals >= 1) score += 1;
  if (bp.requiredApprovals >= 2) score += 1;
  if (bp.dismissStaleReviews) score += 1;
  if (bp.requireCodeOwners) score += 1;
  if (bp.enforceAdmins) score += 1;
  if (bp.requireStatusChecks) score += 1;
  return score;
}

async function createAlert(
  orgId: string,
  opts: {
    type: string;
    severity: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
    dedupeKey: string;
  }
): Promise<void> {
  // Deduplicate: skip if identical alert exists in last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await db.complianceAlert.findFirst({
    where: {
      orgId,
      type: opts.type,
      createdAt: { gte: since },
      // Match on the dedupeKey stored in metadata
      metadata: { path: ["dedupeKey"], equals: opts.dedupeKey },
    },
    select: { id: true },
  });

  if (existing) return; // Already alerted

  await db.complianceAlert.create({
    data: {
      orgId,
      type: opts.type,
      severity: opts.severity,
      title: opts.title,
      description: opts.description,
      metadata: { ...(opts.metadata ?? {}), dedupeKey: opts.dedupeKey },
    },
  });

  // Non-blocking email notification
  sendAlertEmail(orgId, opts).catch((err) =>
    logger.warn("Failed to send alert email", { orgId, type: opts.type, error: String(err) })
  );
}

async function sendAlertEmail(
  orgId: string,
  alert: { type: string; severity: string; title: string; description: string }
): Promise<void> {
  const prefs = await getOrgNotificationPreferences(orgId);
  if (!prefs.syncFailures) return; // Re-use the syncFailures preference for monitoring alerts

  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const members = await db.orgMembership.findMany({
    where: { orgId, role: { in: ["owner", "admin"] } },
    include: { user: { select: { email: true, name: true } } },
  });

  const severityColor =
    alert.severity === "critical" ? "#dc2626" : alert.severity === "high" ? "#ea580c" : "#d97706";
  const dashboardUrl = `${process.env.NEXTAUTH_URL || "https://app.vigil-sec.net"}/dashboard`;

  await Promise.allSettled(
    members
      .filter((m) => m.user.email)
      .map((m) =>
        resend.emails.send({
          from: process.env.EMAIL_FROM || "Vigil <noreply@vigil-sec.net>",
          to: m.user.email!,
          subject: `[${alert.severity.toUpperCase()}] ${alert.title} — ${escapeHtml(org?.name ?? "Your Organization")}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;">
              <h2 style="color:${severityColor}">⚠ Compliance Alert</h2>
              <p><strong>${escapeHtml(alert.title)}</strong></p>
              <p>${escapeHtml(alert.description)}</p>
              <p style="margin-top:24px;">
                <a href="${dashboardUrl}" style="background:${severityColor};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
                  View Dashboard
                </a>
              </p>
            </div>
          `,
        })
      )
  );
}
