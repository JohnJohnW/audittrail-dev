import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { WEBHOOK_CONFIG } from "@/lib/constants";
import {
  handlePushEvent,
  handlePullRequestEvent,
  handlePullRequestReviewEvent,
  handleMemberEvent,
  handleOrganizationEvent,
  handleWorkflowRunEvent,
  handleDependabotAlertEvent,
  handleCodeScanningAlertEvent,
  handleSecretScanningAlertEvent,
} from "@/lib/webhook-handlers";
import type {
  PushWebhookPayload,
  PullRequestWebhookPayload,
  PullRequestReviewWebhookPayload,
  MemberWebhookPayload,
  OrganizationWebhookPayload,
  WorkflowRunWebhookPayload,
  DependabotAlertWebhookPayload,
  CodeScanningAlertWebhookPayload,
  SecretScanningAlertWebhookPayload,
} from "@/types/webhook";

/**
 * Verifies the GitHub webhook HMAC-SHA256 signature.
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Resolves the orgId from the webhook payload.
 * Looks up the organization by matching the repository's full_name or the installation ID.
 */
async function resolveOrgId(payload: Record<string, unknown>): Promise<string | null> {
  // Try to resolve via repository full name
  const repository = payload.repository as { full_name?: string } | undefined;
  if (repository?.full_name) {
    const repo = await db.repository.findFirst({
      where: { fullName: repository.full_name, isActive: true },
      select: { orgId: true },
    });
    if (repo) return repo.orgId;
  }

  // Try to resolve via organization login
  const organization = payload.organization as { login?: string } | undefined;
  if (organization?.login) {
    const connection = await db.gitHubConnection.findFirst({
      where: { githubAccountLogin: organization.login },
      select: { orgId: true },
    });
    if (connection) return connection.orgId;
  }

  // Try to resolve via installation ID
  const installation = payload.installation as { id?: number } | undefined;
  if (installation?.id) {
    const connection = await db.gitHubConnection.findFirst({
      where: { installationId: installation.id },
      select: { orgId: true },
    });
    if (connection) return connection.orgId;
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  let body: string;
  try {
    body = await request.text();
  } catch (error) {
    logger.error("Webhook: failed to read request body", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate payload size
  if (body.length > WEBHOOK_CONFIG.MAX_PAYLOAD_SIZE) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Verify webhook secret is configured
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("GITHUB_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Verify HMAC-SHA256 signature
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!verifySignature(body, signature, webhookSecret)) {
    logger.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse event metadata
  const eventType = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  if (!eventType || !deliveryId) {
    return NextResponse.json({ error: "Missing event headers" }, { status: 400 });
  }

  // Parse the payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Resolve the organization this webhook belongs to
  const orgId = await resolveOrgId(payload);
  if (!orgId) {
    logger.warn(`Webhook: could not resolve org for ${eventType} event (delivery: ${deliveryId})`);
    // Return 200 to prevent GitHub from retrying — we just don't have this org
    return NextResponse.json({ received: true, processed: false });
  }

  // Deduplicate by delivery ID
  const existing = await db.webhookEvent.findUnique({
    where: { deliveryId },
    select: { id: true },
  });

  if (existing) {
    logger.info(`Webhook: duplicate delivery ${deliveryId}, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Log the webhook event
  const webhookEvent = await db.webhookEvent.create({
    data: {
      orgId,
      deliveryId,
      eventType,
      action: (payload.action as string) || null,
      payload: payload as object,
    },
  });

  // Dispatch to handler — fire and forget (don't block the response)
  const processEvent = async () => {
    try {
      switch (eventType) {
        case "push":
          await handlePushEvent(orgId, payload as unknown as PushWebhookPayload);
          break;

        case "pull_request":
          await handlePullRequestEvent(orgId, payload as unknown as PullRequestWebhookPayload);
          break;

        case "pull_request_review":
          await handlePullRequestReviewEvent(
            orgId,
            payload as unknown as PullRequestReviewWebhookPayload
          );
          break;

        case "member":
          await handleMemberEvent(orgId, payload as unknown as MemberWebhookPayload);
          break;

        case "organization":
          await handleOrganizationEvent(orgId, payload as unknown as OrganizationWebhookPayload);
          break;

        case "workflow_run":
          await handleWorkflowRunEvent(orgId, payload as unknown as WorkflowRunWebhookPayload);
          break;

        case "dependabot_alert":
          await handleDependabotAlertEvent(
            orgId,
            payload as unknown as DependabotAlertWebhookPayload
          );
          break;

        case "code_scanning_alert":
          await handleCodeScanningAlertEvent(
            orgId,
            payload as unknown as CodeScanningAlertWebhookPayload
          );
          break;

        case "secret_scanning_alert":
          await handleSecretScanningAlertEvent(
            orgId,
            payload as unknown as SecretScanningAlertWebhookPayload
          );
          break;

        case "branch_protection_rule":
        case "deployment":
        case "release":
        case "check_suite":
        case "check_run":
        case "security_advisory":
        case "repository":
          // Log but don't process yet
          logger.info(`Webhook: received ${eventType} event, logging only`);
          break;

        default:
          logger.info(`Webhook: unhandled event type: ${eventType}`);
      }

      // Mark as processed
      await db.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Webhook: error processing ${eventType} event`, error);
      await db.webhookEvent
        .update({
          where: { id: webhookEvent.id },
          data: { error: errorMessage },
        })
        .catch(() => {
          // Best effort — don't fail the webhook for logging errors
        });
    }
  };

  // Fire-and-forget processing (same pattern as alert detection in cron route)
  processEvent().catch((error) => {
    logger.error(`Webhook: unhandled error in processEvent`, error);
  });

  return NextResponse.json({ received: true });
}
