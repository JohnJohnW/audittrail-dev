/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// auth is already mocked globally in vitest.setup.ts via vi.mock("@/lib/auth")
// We just need the mock reference to control the return value.
import { auth } from "@/lib/auth";

const mockAuth = vi.mocked(auth);

const mockDb = vi.hoisted(() => ({
  gitHubConnection: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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

// ─── Import route handler AFTER mocks ────────────────────────────────────────

import { GET } from "@/app/api/github/app-callback/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCallbackRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/github/app-callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: "user-1", name: "Test User", email: "test@example.com" },
    orgId: "org-1",
    expires: "2099-01-01",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/github/app-callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.gitHubConnection.findFirst.mockResolvedValue({ id: "conn-1" });
    mockDb.gitHubConnection.update.mockResolvedValue({});
    mockDb.gitHubConnection.updateMany.mockResolvedValue({ count: 1 });
    mockAuth.mockResolvedValue(makeSession() as any);
  });

  it("redirects to /dashboard?github_app_error=1 when installation_id is missing", async () => {
    const req = makeCallbackRequest({});
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_error=1");
  });

  it("redirects to error URL when installation_id is not a valid number", async () => {
    const req = makeCallbackRequest({ installation_id: "not-a-number" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_error=1");
  });

  it("redirects to /auth/signin when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const req = makeCallbackRequest({ installation_id: "12345", setup_action: "install" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/signin");
  });

  it("redirects to /auth/signin when session has no orgId", async () => {
    mockAuth.mockResolvedValue(makeSession({ orgId: undefined }) as any);

    const req = makeCallbackRequest({ installation_id: "12345" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/signin");
  });

  it("updates gitHubConnection with installationId and redirects to /dashboard?github_app_installed=1", async () => {
    const req = makeCallbackRequest({ installation_id: "99999", setup_action: "install" });
    const res = await GET(req);

    expect(mockDb.gitHubConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conn-1" },
        data: { installationId: 99999 },
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_installed=1");
  });

  it("calls updateMany to clear installationId when setup_action=delete", async () => {
    const req = makeCallbackRequest({ installation_id: "99999", setup_action: "delete" });
    const res = await GET(req);

    expect(mockDb.gitHubConnection.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", installationId: 99999 },
        data: { installationId: null },
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    // Should redirect to /dashboard (not the installed URL)
    expect(location).toContain("/dashboard");
    expect(location).not.toContain("github_app_installed=1");
    expect(location).not.toContain("github_app_error=1");
  });

  it("handles setup_action=update like install (updates installationId)", async () => {
    const req = makeCallbackRequest({ installation_id: "77777", setup_action: "update" });
    const res = await GET(req);

    expect(mockDb.gitHubConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conn-1" },
        data: { installationId: 77777 },
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_installed=1");
  });

  it("defaults setup_action to 'install' when not provided", async () => {
    const req = makeCallbackRequest({ installation_id: "11111" });
    const res = await GET(req);

    expect(mockDb.gitHubConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { installationId: 11111 },
      })
    );
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_installed=1");
  });

  it("redirects to error URL with no_connection when no gitHubConnection exists for org", async () => {
    mockDb.gitHubConnection.findFirst.mockResolvedValue(null);

    const req = makeCallbackRequest({ installation_id: "12345", setup_action: "install" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_error=no_connection");
  });

  it("redirects to error URL when a DB error occurs during update", async () => {
    mockDb.gitHubConnection.update.mockRejectedValue(new Error("Connection refused"));

    const req = makeCallbackRequest({ installation_id: "12345", setup_action: "install" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("github_app_error=1");
  });
});
