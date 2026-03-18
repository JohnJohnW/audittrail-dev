/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleDependabotAlertEvent,
  handleCodeScanningAlertEvent,
  handleSecretScanningAlertEvent,
} from "@/lib/webhook-handlers";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  getCacheKey: (...parts: string[]) => parts.join(":"),
}));

const mockDb = vi.hoisted(() => ({
  repository: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  complianceAlert: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDependabotPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "created",
    alert: {
      number: 1,
      html_url: "https://github.com/owner/repo/security/dependabot/1",
      dependency: { package: { name: "lodash", ecosystem: "npm" } },
      security_advisory: {
        ghsa_id: "GHSA-xxxx-xxxx-xxxx",
        cve_id: "CVE-2021-12345",
        summary: "Prototype pollution in lodash",
        severity: "critical",
      },
      security_vulnerability: {
        first_patched_version: { identifier: "4.17.21" },
      },
    },
    repository: {
      id: 1,
      name: "repo",
      full_name: "owner/repo",
      private: false,
      default_branch: "main",
      html_url: "https://github.com/owner/repo",
    },
    sender: { id: 1, login: "user", type: "User" },
    ...overrides,
  };
}

function makeCodeScanningPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "created",
    alert: {
      number: 10,
      html_url: "https://github.com/owner/repo/security/code-scanning/10",
      rule: {
        id: "js/sql-injection",
        description: "SQL Injection",
        severity: "error",
        security_severity_level: "high",
      },
      tool: { name: "CodeQL" },
    },
    repository: {
      id: 1,
      name: "repo",
      full_name: "owner/repo",
      private: false,
      default_branch: "main",
      html_url: "https://github.com/owner/repo",
    },
    sender: { id: 1, login: "user", type: "User" },
    ...overrides,
  };
}

function makeSecretScanningPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "created",
    alert: {
      number: 5,
      secret_type: "github_personal_access_token",
      secret_type_display_name: "GitHub Personal Access Token",
      html_url: "https://github.com/owner/repo/security/secret-scanning/5",
      resolution: null,
    },
    repository: {
      id: 1,
      name: "repo",
      full_name: "owner/repo",
      private: false,
      default_branch: "main",
      html_url: "https://github.com/owner/repo",
    },
    sender: { id: 1, login: "user", type: "User" },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("handleDependabotAlertEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.complianceAlert.create.mockResolvedValue({});
    mockDb.complianceAlert.findFirst.mockResolvedValue(null);
    mockDb.complianceAlert.update.mockResolvedValue({});
  });

  it("creates a ComplianceAlert for a critical CVE", async () => {
    await handleDependabotAlertEvent("org-1", makeDependabotPayload() as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: "org-1",
          type: "dependabot_vulnerability",
          severity: "critical",
          metadata: expect.objectContaining({
            alertNumber: 1,
            repository: "owner/repo",
            package: "lodash",
            cveId: "CVE-2021-12345",
          }),
        }),
      })
    );
  });

  it("creates a ComplianceAlert for a high severity finding", async () => {
    const payload = makeDependabotPayload();
    (payload.alert.security_advisory as any).severity = "high";

    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "high" }),
      })
    );
  });

  it("skips creating an alert for low severity findings", async () => {
    const payload = makeDependabotPayload();
    (payload.alert.security_advisory as any).severity = "low";

    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("skips creating an alert for medium severity findings", async () => {
    const payload = makeDependabotPayload();
    (payload.alert.security_advisory as any).severity = "medium";

    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("resolves an open alert when action is 'fixed'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "alert-1" });

    const payload = makeDependabotPayload({ action: "fixed" });
    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockDb.complianceAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          type: "dependabot_vulnerability",
          resolvedAt: null,
        }),
      })
    );
    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert-1" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("resolves an open alert when action is 'dismissed'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "alert-2" });

    const payload = makeDependabotPayload({ action: "dismissed" });
    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert-2" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("does not call update if no existing open alert is found on fix", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue(null);

    const payload = makeDependabotPayload({ action: "fixed" });
    await handleDependabotAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).not.toHaveBeenCalled();
  });
});

describe("handleCodeScanningAlertEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.complianceAlert.create.mockResolvedValue({});
    mockDb.complianceAlert.findFirst.mockResolvedValue(null);
    mockDb.complianceAlert.update.mockResolvedValue({});
  });

  it("creates a ComplianceAlert for an 'error' severity rule", async () => {
    await handleCodeScanningAlertEvent("org-1", makeCodeScanningPayload() as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: "org-1",
          type: "code_scanning",
          metadata: expect.objectContaining({
            alertNumber: 10,
            repository: "owner/repo",
            ruleId: "js/sql-injection",
            toolName: "CodeQL",
          }),
        }),
      })
    );
  });

  it("creates a ComplianceAlert for critical security_severity_level", async () => {
    const payload = makeCodeScanningPayload();
    (payload.alert.rule as any).security_severity_level = "critical";
    (payload.alert.rule as any).severity = "note"; // override rule severity to note to isolate test

    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "critical" }),
      })
    );
  });

  it("skips 'note' severity when no high/critical security level", async () => {
    const payload = makeCodeScanningPayload();
    (payload.alert.rule as any).severity = "note";
    (payload.alert.rule as any).security_severity_level = "low";

    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("skips 'warning' severity when no high/critical security level", async () => {
    const payload = makeCodeScanningPayload();
    (payload.alert.rule as any).severity = "warning";
    (payload.alert.rule as any).security_severity_level = undefined;

    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("resolves an open alert when action is 'fixed'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "cs-alert-1" });

    const payload = makeCodeScanningPayload({ action: "fixed" });
    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cs-alert-1" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("resolves an open alert when action is 'closed_by_user'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "cs-alert-2" });

    const payload = makeCodeScanningPayload({ action: "closed_by_user" });
    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cs-alert-2" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("creates alert for 'appeared_in_branch' action with actionable severity", async () => {
    const payload = makeCodeScanningPayload({ action: "appeared_in_branch" });
    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
  });

  it("creates alert for 'reopened' action with actionable severity", async () => {
    const payload = makeCodeScanningPayload({ action: "reopened" });
    await handleCodeScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
  });
});

describe("handleSecretScanningAlertEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.complianceAlert.create.mockResolvedValue({});
    mockDb.complianceAlert.findFirst.mockResolvedValue(null);
    mockDb.complianceAlert.update.mockResolvedValue({});
  });

  it("always creates a CRITICAL alert regardless of secret type on 'created'", async () => {
    await handleSecretScanningAlertEvent("org-1", makeSecretScanningPayload() as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: "org-1",
          type: "secret_scanning",
          severity: "critical",
          metadata: expect.objectContaining({
            alertNumber: 5,
            repository: "owner/repo",
            secretType: "github_personal_access_token",
            publiclyLeaked: false,
          }),
        }),
      })
    );
  });

  it("creates a CRITICAL alert on 'publicly_leaked' action with publiclyLeaked=true", async () => {
    const payload = makeSecretScanningPayload({ action: "publicly_leaked" });
    await handleSecretScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledTimes(1);
    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "critical",
          metadata: expect.objectContaining({ publiclyLeaked: true }),
        }),
      })
    );
  });

  it("resolves an alert when action is 'resolved' and resolution is 'revoked'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "ss-alert-1" });

    const payload = makeSecretScanningPayload({
      action: "resolved",
      alert: {
        ...makeSecretScanningPayload().alert,
        resolution: "revoked",
      },
    });
    await handleSecretScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ss-alert-1" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("resolves an alert when action is 'resolved' and resolution is 'false_positive'", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "ss-alert-2" });

    const payload = makeSecretScanningPayload({
      action: "resolved",
      alert: {
        ...makeSecretScanningPayload().alert,
        resolution: "false_positive",
      },
    });
    await handleSecretScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ss-alert-2" },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      })
    );
  });

  it("does NOT resolve when resolution is 'used_in_tests' (invalid resolution)", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue({ id: "ss-alert-3" });

    const payload = makeSecretScanningPayload({
      action: "resolved",
      alert: {
        ...makeSecretScanningPayload().alert,
        resolution: "used_in_tests",
      },
    });
    await handleSecretScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).not.toHaveBeenCalled();
  });

  it("does not update when no existing open alert found on resolution", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValue(null);

    const payload = makeSecretScanningPayload({
      action: "resolved",
      alert: {
        ...makeSecretScanningPayload().alert,
        resolution: "revoked",
      },
    });
    await handleSecretScanningAlertEvent("org-1", payload as any);

    expect(mockDb.complianceAlert.update).not.toHaveBeenCalled();
  });
});
