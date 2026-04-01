import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { WEBHOOK_CONFIG } from "@/lib/constants";

// ── GitHub IP Allowlist (defense-in-depth, secondary to HMAC) ────────────────
// GitHub publishes its webhook source IPs at https://api.github.com/meta
// We cache the list in module scope (shared across warm invocations) and
// refresh every hour. A stale or empty cache skips the check rather than
// blocking legitimate webhooks. The HMAC remains the primary guard.

let _githubHookCIDRs: string[] = [];
let _githubIPsLastFetched = 0;
const GITHUB_IP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getGitHubHookCIDRs(): Promise<string[]> {
  const now = Date.now();
  if (_githubHookCIDRs.length > 0 && now - _githubIPsLastFetched < GITHUB_IP_CACHE_TTL_MS) {
    return _githubHookCIDRs;
  }
  try {
    const res = await fetch("https://api.github.com/meta", {
      headers: { "User-Agent": "AuditTrail-Webhook-Validator/1.0" },
      signal: AbortSignal.timeout(3000), // 3 s timeout, don't slow webhooks
    });
    if (res.ok) {
      const data = (await res.json()) as { hooks?: string[] };
      if (Array.isArray(data.hooks) && data.hooks.length > 0) {
        _githubHookCIDRs = data.hooks;
        _githubIPsLastFetched = now;
      }
    }
  } catch {
    // Network error fetching meta, use cached list (possibly empty)
  }
  return _githubHookCIDRs;
}

/** Convert dotted-decimal IPv4 string to unsigned 32-bit integer. */
function ipv4ToUint32(ip: string): number {
  return ip.split(".").reduce((acc, octet) => ((acc << 8) | parseInt(octet, 10)) >>> 0, 0);
}

/** Return true if `ip` falls within the IPv4 CIDR block. */
function isIPv4InCIDR(ip: string, cidr: string): boolean {
  const [network, bits] = cidr.split("/");
  if (!network || !bits) return false;
  const prefix = parseInt(bits, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipv4ToUint32(ip) & mask) === (ipv4ToUint32(network) & mask);
}

/** Return true if `ip` starts with the IPv6 network prefix (coarse check). */
function isIPv6InCIDR(ip: string, cidr: string): boolean {
  const [network] = cidr.split("/");
  if (!network) return false;
  // Normalise both sides to lower-case and compare the non-wildcard segments
  const prefix = network.replace(/::$/, "").toLowerCase();
  return ip.toLowerCase().startsWith(prefix);
}

/**
 * Check whether `ip` matches any CIDR in `cidrs`.
 * Skips IPv6 ranges when `ip` is IPv4 and vice versa.
 */
function isIPInAnyCIDR(ip: string, cidrs: string[]): boolean {
  const isIPv6 = ip.includes(":");
  return cidrs.some((cidr) => {
    const isIPv6CIDR = cidr.includes(":");
    if (isIPv6 !== isIPv6CIDR) return false; // address family mismatch
    return isIPv6 ? isIPv6InCIDR(ip, cidr) : isIPv4InCIDR(ip, cidr);
  });
}
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
  handleBranchProtectionRuleEvent,
  handleRepositoryEvent,
  handlePublicEvent,
  handleDeploymentStatusEvent,
  handleReleaseEvent,
  handleTeamEvent,
  handleSecurityAndAnalysisEvent,
  handleDeployKeyEvent,
  handleRepositoryRulesetEvent,
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
  BranchProtectionRuleWebhookPayload,
  DeploymentStatusWebhookPayload,
  ReleaseWebhookPayload,
  RepositoryWebhookPayload,
  PublicWebhookPayload,
  TeamWebhookPayload,
  SecurityAndAnalysisWebhookPayload,
  DeployKeyWebhookPayload,
  RepositoryRulesetWebhookPayload,
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

  // ── GitHub IP allowlist (defense-in-depth, after HMAC) ─────────────────────
  // We verify HMAC first (primary guard). The IP check is secondary: if we can
  // fetch GitHub's published ranges and the source IP is not in them, we log
  // the anomaly. We do NOT hard-block here so that a stale IP list never breaks
  // legitimate deliveries. The HMAC already proved authenticity.
  const clientIP =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  if (clientIP) {
    const githubCIDRs = await getGitHubHookCIDRs();
    if (githubCIDRs.length > 0 && !isIPInAnyCIDR(clientIP, githubCIDRs)) {
      // HMAC passed but IP is outside GitHub's published ranges. Log for monitoring.
      // This could indicate a SSRF attempt or a proxied request; escalate if recurring.
      logger.warn("Webhook: source IP not in GitHub published ranges", {
        ip: clientIP,
        event: request.headers.get("x-github-event"),
        delivery: request.headers.get("x-github-delivery"),
      });
    }
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
    // Return 200 to prevent GitHub from retrying - we just don't have this org
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

  // Dispatch to handler - fire and forget (don't block the response)
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
          await handleBranchProtectionRuleEvent(
            orgId,
            payload as unknown as BranchProtectionRuleWebhookPayload
          );
          break;

        case "repository":
          await handleRepositoryEvent(orgId, payload as unknown as RepositoryWebhookPayload);
          break;

        case "public":
          await handlePublicEvent(orgId, payload as unknown as PublicWebhookPayload);
          break;

        case "deployment_status":
          await handleDeploymentStatusEvent(
            orgId,
            payload as unknown as DeploymentStatusWebhookPayload
          );
          break;

        case "release":
          await handleReleaseEvent(orgId, payload as unknown as ReleaseWebhookPayload);
          break;

        case "team":
          await handleTeamEvent(orgId, payload as unknown as TeamWebhookPayload);
          break;

        case "security_and_analysis":
          await handleSecurityAndAnalysisEvent(
            orgId,
            payload as unknown as SecurityAndAnalysisWebhookPayload
          );
          break;

        case "deploy_key":
          await handleDeployKeyEvent(orgId, payload as unknown as DeployKeyWebhookPayload);
          break;

        case "repository_ruleset":
          await handleRepositoryRulesetEvent(
            orgId,
            payload as unknown as RepositoryRulesetWebhookPayload
          );
          break;

        case "deployment":
        case "check_suite":
        case "check_run":
        case "security_advisory":
        case "fork":
        case "workflow_dispatch":
        case "meta":
        case "installation_target":
        case "deployment_protection_rule":
        case "branch_protection_configuration":
          // Logged for audit trail, no specific compliance action required
          logger.info(`Webhook: received ${eventType} event (logged)`);
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
          // Best effort - don't fail the webhook for logging errors
        });
    }
  };

  // Fire-and-forget processing (same pattern as alert detection in cron route)
  processEvent().catch((error) => {
    logger.error(`Webhook: unhandled error in processEvent`, error);
  });

  return NextResponse.json({ received: true });
}
