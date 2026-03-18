import { Resend } from "resend";
import { db } from "./db";
import { escapeHtml } from "./utils";
import { logger } from "./logger";

// Lazy-init Resend so missing RESEND_API_KEY doesn't crash at module load time
// (Next.js evaluates modules during static build even without env vars present)
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY is not configured — email notifications are disabled");
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface NotificationPreferences {
  syncFailures: boolean;
  weeklyDigest: boolean;
  exportReady: boolean;
  subscriptionUpdates: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  syncFailures: true,
  weeklyDigest: true,
  exportReady: true,
  subscriptionUpdates: true,
};

/**
 * Get (or lazily create) notification preferences for an org from the database.
 */
export async function getOrgNotificationPreferences(
  orgId: string
): Promise<NotificationPreferences> {
  const prefs = await db.notificationPreferences.upsert({
    where: { orgId },
    update: {},
    create: { orgId, ...DEFAULT_PREFERENCES },
  });
  return {
    syncFailures: prefs.syncFailures,
    weeklyDigest: prefs.weeklyDigest,
    exportReady: prefs.exportReady,
    subscriptionUpdates: prefs.subscriptionUpdates,
  };
}

/**
 * Update notification preferences for an org.
 */
export async function updateOrgNotificationPreferences(
  orgId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const prefs = await db.notificationPreferences.upsert({
    where: { orgId },
    update: updates,
    create: { orgId, ...DEFAULT_PREFERENCES, ...updates },
  });
  return {
    syncFailures: prefs.syncFailures,
    weeklyDigest: prefs.weeklyDigest,
    exportReady: prefs.exportReady,
    subscriptionUpdates: prefs.subscriptionUpdates,
  };
}

export async function sendWeeklyDigest(
  userId: string,
  orgId: string,
  summary: {
    repositoriesSynced: number;
    newCommits: number;
    newPRs: number;
    complianceScore: number;
  }
) {
  const preferences = await getOrgNotificationPreferences(orgId);
  if (!preferences.weeklyDigest) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const org = await db.organization.findUnique({ where: { id: orgId } });

  const resend = getResend();
  if (!resend) return;

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Vigil <noreply@vigil-sec.net>",
    to: user.email,
    subject: `Your compliance posture — ${dateStr}`,
    html: `
      <h2>Compliance posture — ${escapeHtml(org?.name || "Organization")}</h2>
      <p>What happened in your repositories this week:</p>
      <ul>
        <li><strong>Repositories Synced:</strong> ${Number(summary.repositoriesSynced)}</li>
        <li><strong>New Commits:</strong> ${Number(summary.newCommits)}</li>
        <li><strong>New Pull Requests:</strong> ${Number(summary.newPRs)}</li>
        <li><strong>Compliance Score:</strong> ${Number(summary.complianceScore)}%</li>
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/dashboard">View Dashboard</a></p>
    `,
  });
}

/**
 * Send weekly GRC digest for pro orgs.
 * Includes AI-drafted summary, score delta, open alerts, open gaps.
 */
export async function sendWeeklyGRCDigest(
  userId: string,
  orgId: string,
  data: {
    scoreDelta: number;
    currentScore: number;
    openAlerts: number;
    openGaps: number;
    openRisks: number;
  }
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const prefs = await getOrgNotificationPreferences(orgId);
  if (!prefs.weeklyDigest) return;

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return;

  const grcDateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  await resend.emails.send({
    from: "Vigil <notifications@vigil-sec.net>",
    to: user.email,
    subject: `Your compliance posture — ${grcDateStr}`,
    html: `
      <h2>Compliance posture — ${grcDateStr}</h2>
      <ul>
        <li><strong>Compliance Score:</strong> ${Number(data.currentScore)}%${data.scoreDelta !== 0 ? ` (${data.scoreDelta > 0 ? "+" : ""}${Number(data.scoreDelta)}% this week)` : ""}</li>
        <li><strong>Open Alerts:</strong> ${Number(data.openAlerts)}</li>
        <li><strong>Open Gaps:</strong> ${Number(data.openGaps)}</li>
        <li><strong>Open Risk Treatments:</strong> ${Number(data.openRisks)}</li>
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/grc">View GRC Dashboard</a></p>
    `,
  });
}

/**
 * Send monthly CISO summary with posture trend and critical risk delta.
 */
export async function sendMonthlyCISOSummary(
  userId: string,
  orgId: string,
  data: {
    currentScore: number;
    monthlyDelta: number;
    criticalRisks: number;
    activeAudits: number;
  }
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const prefs = await getOrgNotificationPreferences(orgId);
  if (!prefs.weeklyDigest) return; // Reuse weeklyDigest pref for now

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return;

  await resend.emails.send({
    from: "Vigil <notifications@vigil-sec.net>",
    to: user.email,
    subject: `Vigil — Monthly posture summary`,
    html: `
      <h2>Monthly posture summary</h2>
      <ul>
        <li><strong>Compliance Score:</strong> ${Number(data.currentScore)}%</li>
        <li><strong>Monthly Change:</strong> ${data.monthlyDelta > 0 ? "+" : ""}${Number(data.monthlyDelta)}%</li>
        <li><strong>Critical Risks:</strong> ${Number(data.criticalRisks)}</li>
        <li><strong>Active Audits:</strong> ${Number(data.activeAudits)}</li>
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/ciso">View CISO Dashboard</a></p>
    `,
  });
}
