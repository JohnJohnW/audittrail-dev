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

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Audit Trail <noreply@audittrail.dev>",
    to: user.email,
    subject: `Weekly Compliance Digest - ${escapeHtml(org?.name || "Organization")}`,
    html: `
      <h2>Weekly Compliance Summary</h2>
      <p>Here's your compliance activity for the past week:</p>
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
