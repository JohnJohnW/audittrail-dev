import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  webhookEvent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  repository: {
    findFirst: vi.fn(),
  },
  gitHubConnection: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const {
  mockHandlePushEvent,
  mockHandlePullRequestEvent,
  mockHandlePullRequestReviewEvent,
  mockHandleMemberEvent,
  mockHandleOrganizationEvent,
  mockHandleWorkflowRunEvent,
  mockHandleDependabotAlertEvent,
  mockHandleCodeScanningAlertEvent,
  mockHandleSecretScanningAlertEvent,
} = vi.hoisted(() => ({
  mockHandlePushEvent: vi.fn().mockResolvedValue(undefined),
  mockHandlePullRequestEvent: vi.fn().mockResolvedValue(undefined),
  mockHandlePullRequestReviewEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleMemberEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleOrganizationEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleWorkflowRunEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleDependabotAlertEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleCodeScanningAlertEvent: vi.fn().mockResolvedValue(undefined),
  mockHandleSecretScanningAlertEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/webhook-handlers", () => ({
  handlePushEvent: mockHandlePushEvent,
  handlePullRequestEvent: mockHandlePullRequestEvent,
  handlePullRequestReviewEvent: mockHandlePullRequestReviewEvent,
  handleMemberEvent: mockHandleMemberEvent,
  handleOrganizationEvent: mockHandleOrganizationEvent,
  handleWorkflowRunEvent: mockHandleWorkflowRunEvent,
  handleDependabotAlertEvent: mockHandleDependabotAlertEvent,
  handleCodeScanningAlertEvent: mockHandleCodeScanningAlertEvent,
  handleSecretScanningAlertEvent: mockHandleSecretScanningAlertEvent,
}));

// ─── Import route handler AFTER mocks ────────────────────────────────────────

import { POST } from "@/app/api/webhooks/github/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_SECRET = "test-webhook-secret";

function makeWebhookRequest(
  payload: Record<string, unknown>,
  eventType: string,
  secret: string = TEST_SECRET,
  deliveryId: string = "delivery-123"
): NextRequest {
  const body = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  return new NextRequest("http://localhost/api/webhooks/github", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signature,
      "x-github-event": eventType,
      "x-github-delivery": deliveryId,
    },
    body,
  });
}

const basePushPayload = {
  ref: "refs/heads/main",
  before: "abc",
  after: "def",
  repository: {
    id: 1,
    name: "repo",
    full_name: "owner/repo",
    private: false,
    default_branch: "main",
    html_url: "https://github.com/owner/repo",
  },
  sender: { id: 1, login: "user", type: "User" },
  commits: [],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default env
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;

    // Default db mocks — resolvable org via repository
    mockDb.repository.findFirst.mockResolvedValue({ orgId: "org-1" });
    mockDb.gitHubConnection.findFirst.mockResolvedValue(null);
    mockDb.webhookEvent.findUnique.mockResolvedValue(null); // not duplicate
    mockDb.webhookEvent.create.mockResolvedValue({ id: "event-1" });
    mockDb.webhookEvent.update.mockResolvedValue({});
  });

  it("returns 200 { received: true } for a valid push event", async () => {
    const req = makeWebhookRequest(basePushPayload, "push");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });

  it("returns 400 when x-hub-signature-256 header is missing", async () => {
    const payload = JSON.stringify(basePushPayload);
    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "delivery-missing-sig",
        // deliberately omitting x-hub-signature-256
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing signature/i);
  });

  it("returns 401 when signature is invalid", async () => {
    const body = JSON.stringify(basePushPayload);
    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256":
          "sha256=invalidsignature0000000000000000000000000000000000000000000000000",
        "x-github-event": "push",
        "x-github-delivery": "delivery-bad-sig",
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const resBody = await res.json();
    expect(resBody.error).toMatch(/Invalid signature/i);
  });

  it("returns 400 when x-github-event header is missing", async () => {
    const bodyStr = JSON.stringify(basePushPayload);
    const signature = `sha256=${createHmac("sha256", TEST_SECRET).update(bodyStr).digest("hex")}`;

    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
        // missing x-github-event
        "x-github-delivery": "delivery-no-event",
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const resBody = await res.json();
    expect(resBody.error).toMatch(/Missing event headers/i);
  });

  it("returns 400 when x-github-delivery header is missing", async () => {
    const bodyStr = JSON.stringify(basePushPayload);
    const signature = `sha256=${createHmac("sha256", TEST_SECRET).update(bodyStr).digest("hex")}`;

    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
        "x-github-event": "push",
        // missing x-github-delivery
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 413 when payload exceeds max size", async () => {
    // Create a body larger than 10MB
    const largePayload = "x".repeat(11 * 1024 * 1024);
    const signature = `sha256=${createHmac("sha256", TEST_SECRET).update(largePayload).digest("hex")}`;

    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-hub-signature-256": signature,
        "x-github-event": "push",
        "x-github-delivery": "delivery-large",
      },
      body: largePayload,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/Payload too large/i);
  });

  it("returns 200 { received: true, duplicate: true } for duplicate delivery_id", async () => {
    mockDb.webhookEvent.findUnique.mockResolvedValue({ id: "existing-event" });

    const req = makeWebhookRequest(basePushPayload, "push", TEST_SECRET, "duplicate-delivery");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
  });

  it("returns 200 { received: true, processed: false } when org cannot be resolved", async () => {
    mockDb.repository.findFirst.mockResolvedValue(null);
    mockDb.gitHubConnection.findFirst.mockResolvedValue(null);

    // Payload without organization or installation
    const unresolvedPayload = {
      repository: { full_name: "unknown/repo" },
    };

    const req = makeWebhookRequest(unresolvedPayload, "push");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, processed: false });
  });

  it("dispatches push event to handlePushEvent", async () => {
    const req = makeWebhookRequest(basePushPayload, "push");
    await POST(req);

    // processEvent runs fire-and-forget — wait a tick for it to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandlePushEvent).toHaveBeenCalledWith("org-1", basePushPayload);
  });

  it("dispatches pull_request event to handlePullRequestEvent", async () => {
    const prPayload = {
      action: "opened",
      number: 1,
      pull_request: {
        id: 100,
        number: 1,
        title: "Test PR",
        body: null,
        state: "open",
        user: { id: 1, login: "dev", type: "User" },
        html_url: "https://github.com/owner/repo/pull/1",
        merged_at: null,
        closed_at: null,
        base: { ref: "main" },
        head: { ref: "feature" },
      },
      repository: basePushPayload.repository,
      sender: { id: 1, login: "dev", type: "User" },
    };

    const req = makeWebhookRequest(prPayload, "pull_request");
    await POST(req);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandlePullRequestEvent).toHaveBeenCalledWith("org-1", prPayload);
  });

  it("returns 500 when GITHUB_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const bodyStr = JSON.stringify(basePushPayload);
    // We need a valid-looking request body first (size check happens before secret check)
    const req = new NextRequest("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=abc",
        "x-github-event": "push",
        "x-github-delivery": "delivery-no-secret",
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Server configuration error/i);

    // Restore
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
  });

  it("resolves org via organization.login when repository not found", async () => {
    mockDb.repository.findFirst.mockResolvedValue(null);
    mockDb.gitHubConnection.findFirst.mockResolvedValue({ orgId: "org-2" });

    const payload = {
      action: "member_added",
      organization: { login: "myorg" },
      sender: { id: 1, login: "admin", type: "User" },
    };

    const req = makeWebhookRequest(payload, "organization");
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.processed).not.toBe(false);
  });
});
