import { Resend } from "resend";
import { db } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface NotificationPreferences {
  syncFailures: boolean;
  weeklyDigest: boolean;
  exportReady: boolean;
  subscriptionUpdates: boolean;
}

export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  // Default preferences - in future, store in database
  return {
    syncFailures: true,
    weeklyDigest: true,
    exportReady: true,
    subscriptionUpdates: true,
  };
}

export async function sendSyncFailureNotification(
  userId: string,
  orgId: string,
  repositoryName: string,
  error: string
) {
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.syncFailures) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const org = await db.organization.findUnique({ where: { id: orgId } });

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "AuditTrail <noreply@audittrail.dev>",
    to: user.email,
    subject: `Sync Failed: ${repositoryName}`,
    html: `
      <h2>Repository Sync Failed</h2>
      <p>We encountered an error while syncing your repository <strong>${repositoryName}</strong> for organization <strong>${org?.name}</strong>.</p>
      <p><strong>Error:</strong> ${error}</p>
      <p>Please check your repository settings and try syncing again.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/repositories">View Repositories</a></p>
    `,
  });
}

export async function sendExportReadyNotification(
  userId: string,
  orgId: string,
  fileName: string,
  downloadUrl: string
) {
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.exportReady) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "AuditTrail <noreply@audittrail.dev>",
    to: user.email,
    subject: `Export Ready: ${fileName}`,
    html: `
      <h2>Your Export is Ready</h2>
      <p>Your compliance evidence export <strong>${fileName}</strong> has been generated successfully.</p>
      <p><a href="${downloadUrl}">Download Export</a></p>
      <p>This link will expire in 7 days.</p>
    `,
  });
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
  const preferences = await getUserNotificationPreferences(userId);
  if (!preferences.weeklyDigest) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const org = await db.organization.findUnique({ where: { id: orgId } });

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "AuditTrail <noreply@audittrail.dev>",
    to: user.email,
    subject: `Weekly Compliance Digest - ${org?.name}`,
    html: `
      <h2>Weekly Compliance Summary</h2>
      <p>Here's your compliance activity for the past week:</p>
      <ul>
        <li><strong>Repositories Synced:</strong> ${summary.repositoriesSynced}</li>
        <li><strong>New Commits:</strong> ${summary.newCommits}</li>
        <li><strong>New Pull Requests:</strong> ${summary.newPRs}</li>
        <li><strong>Compliance Score:</strong> ${summary.complianceScore}%</li>
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/dashboard">View Dashboard</a></p>
    `,
  });
}
