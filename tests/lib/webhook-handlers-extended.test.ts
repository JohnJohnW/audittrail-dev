/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extended webhook handler tests for the additional event types:
 * branch_protection_rule, repository (visibility), public, deployment_status,
 * release, team, security_and_analysis, deploy_key, repository_ruleset
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock references before vi.mock() hoisting
// ---------------------------------------------------------------------------
const { mockDb, mockInvalidateCache, mockGetCacheKey, mockLogger } = vi.hoisted(() => {
  const mockComplianceAlertCreate = vi.fn().mockResolvedValue({ id: "alert-1" });
  const mockComplianceAlertFindFirst = vi.fn().mockResolvedValue(null);
  const mockComplianceAlertUpdate = vi.fn().mockResolvedValue({});
  const mockRepositoryFindFirst = vi.fn().mockResolvedValue({
    id: "repo-1",
    orgId: "org-1",
    fullName: "acme/api",
    defaultBranch: "main",
  });
  const mockRepositoryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const mockRepositoryUpdate = vi.fn().mockResolvedValue({});
  const mockOrgMembershipEventCreate = vi.fn().mockResolvedValue({ id: "mem-1" });
  const mockCIArtifactUpsert = vi.fn().mockResolvedValue({ id: "art-1" });

  const mockDb = {
    complianceAlert: {
      create: mockComplianceAlertCreate,
      findFirst: mockComplianceAlertFindFirst,
      update: mockComplianceAlertUpdate,
    },
    repository: {
      findFirst: mockRepositoryFindFirst,
      updateMany: mockRepositoryUpdateMany,
      update: mockRepositoryUpdate,
    },
    orgMembershipEvent: { create: mockOrgMembershipEventCreate },
    cIArtifact: { upsert: mockCIArtifactUpsert },
  };

  return {
    mockDb,
    mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
    mockGetCacheKey: vi.fn((...args: string[]) => args.join(":")),
    mockLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/cache", () => ({
  invalidateCache: mockInvalidateCache,
  getCacheKey: mockGetCacheKey,
}));
vi.mock("@/lib/logger", () => ({ logger: mockLogger }));

import {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const orgId = "org-1";

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    name: "api",
    full_name: "acme/api",
    private: true,
    default_branch: "main",
    html_url: "https://github.com/acme/api",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: repo resolved for deployment/release tests
  mockDb.repository.findFirst.mockResolvedValue({
    id: "repo-1",
    orgId,
    fullName: "acme/api",
    defaultBranch: "main",
  });
  // Default: no existing alert
  mockDb.complianceAlert.findFirst.mockResolvedValue(null);
});

// =============================================================================
// handleBranchProtectionRuleEvent
// =============================================================================
describe("handleBranchProtectionRuleEvent", () => {
  const rule = { id: 1, name: "main" };

  it("creates HIGH alert when rule is deleted", async () => {
    await handleBranchProtectionRuleEvent(orgId, {
      action: "deleted",
      rule,
      repository: makeRepo() as any,
      sender: { id: 1, login: "dev", type: "User" },
    });

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId,
          type: "branch_protection_weakened",
          severity: "high",
        }),
      })
    );
    expect(mockInvalidateCache).toHaveBeenCalled();
  });

  it("only logs when rule is created (positive signal, no alert)", async () => {
    await handleBranchProtectionRuleEvent(orgId, {
      action: "created",
      rule,
      repository: makeRepo() as any,
      sender: { id: 1, login: "dev", type: "User" },
    });

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it("only logs when rule is edited", async () => {
    await handleBranchProtectionRuleEvent(orgId, {
      action: "edited",
      rule,
      repository: makeRepo() as any,
      sender: { id: 1, login: "dev", type: "User" },
    });

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleRepositoryEvent
// =============================================================================
describe("handleRepositoryEvent", () => {
  const repo = makeRepo({ visibility: "public", archived: false, disabled: false });

  it("creates CRITICAL alert when repo is publicized", async () => {
    await handleRepositoryEvent(orgId, {
      action: "publicized",
      repository: repo as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId,
          type: "repository_made_public",
          severity: "critical",
        }),
      })
    );
  });

  it("marks repo inactive when deleted", async () => {
    await handleRepositoryEvent(orgId, {
      action: "deleted",
      repository: repo as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.repository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      })
    );
    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("marks repo inactive when archived", async () => {
    await handleRepositoryEvent(orgId, {
      action: "archived",
      repository: repo as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.repository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
  });

  it("logs privatized without creating alert", async () => {
    await handleRepositoryEvent(orgId, {
      action: "privatized",
      repository: repo as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });
});

// =============================================================================
// handlePublicEvent
// =============================================================================
describe("handlePublicEvent", () => {
  it("creates CRITICAL alert for newly public repo", async () => {
    await handlePublicEvent(orgId, {
      repository: makeRepo({ private: false }) as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "critical",
          type: "repository_made_public",
        }),
      })
    );
  });

  it("skips duplicate alert if one already exists", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValueOnce({ id: "existing-alert" });

    await handlePublicEvent(orgId, {
      repository: makeRepo({ private: false }) as any,
      sender: { id: 1, login: "admin", type: "User" },
    });

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleDeploymentStatusEvent
// =============================================================================
describe("handleDeploymentStatusEvent", () => {
  const basePayload = {
    action: "created",
    deployment_status: {
      id: 101,
      state: "success",
      description: null,
      environment: "production",
      log_url: "https://github.com/acme/api/actions/runs/1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creator: null,
    },
    deployment: {
      id: 50,
      sha: "abc123",
      ref: "main",
      environment: "production",
      description: null,
      creator: null,
      created_at: new Date().toISOString(),
    },
    repository: makeRepo() as any,
    sender: { id: 1, login: "github-actions[bot]", type: "Bot" },
  };

  it("creates MEDIUM alert for failed production deployment", async () => {
    await handleDeploymentStatusEvent(orgId, {
      ...basePayload,
      deployment_status: { ...basePayload.deployment_status, state: "failure" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "deployment_failure",
          severity: "medium",
        }),
      })
    );
  });

  it("creates MEDIUM alert for errored production deployment", async () => {
    await handleDeploymentStatusEvent(orgId, {
      ...basePayload,
      deployment_status: { ...basePayload.deployment_status, state: "error" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "deployment_failure" }),
      })
    );
  });

  it("does NOT create alert for failed non-production deployment", async () => {
    await handleDeploymentStatusEvent(orgId, {
      ...basePayload,
      deployment_status: { ...basePayload.deployment_status, state: "failure" },
      deployment: { ...basePayload.deployment, environment: "staging" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("does NOT create alert for successful production deployment", async () => {
    await handleDeploymentStatusEvent(orgId, basePayload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("skips gracefully when repo not found", async () => {
    mockDb.repository.findFirst.mockResolvedValueOnce(null);

    await handleDeploymentStatusEvent(orgId, basePayload as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleReleaseEvent
// =============================================================================
describe("handleReleaseEvent", () => {
  const baseRelease = {
    id: 200,
    tag_name: "v1.2.3",
    name: "Version 1.2.3",
    body: "Bug fixes",
    draft: false,
    prerelease: false,
    html_url: "https://github.com/acme/api/releases/tag/v1.2.3",
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    author: { id: 1, login: "releaser", type: "User" },
    target_commitish: "main",
  };

  it("upserts release artifact for published release", async () => {
    await handleReleaseEvent(orgId, {
      action: "published",
      release: baseRelease,
      repository: makeRepo() as any,
      sender: { id: 1, login: "releaser", type: "User" },
    } as any);

    expect(mockDb.cIArtifact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          artifactType: "release",
          orgId,
          name: "v1.2.3",
        }),
      })
    );
  });

  it("upserts release artifact for 'released' action", async () => {
    await handleReleaseEvent(orgId, {
      action: "released",
      release: baseRelease,
      repository: makeRepo() as any,
      sender: { id: 1, login: "releaser", type: "User" },
    } as any);

    expect(mockDb.cIArtifact.upsert).toHaveBeenCalled();
  });

  it("skips non-published actions", async () => {
    await handleReleaseEvent(orgId, {
      action: "created",
      release: baseRelease,
      repository: makeRepo() as any,
      sender: { id: 1, login: "releaser", type: "User" },
    } as any);

    expect(mockDb.cIArtifact.upsert).not.toHaveBeenCalled();
  });

  it("skips gracefully when repo not found", async () => {
    mockDb.repository.findFirst.mockResolvedValueOnce(null);

    await handleReleaseEvent(orgId, {
      action: "published",
      release: baseRelease,
      repository: makeRepo() as any,
      sender: { id: 1, login: "releaser", type: "User" },
    } as any);

    expect(mockDb.cIArtifact.upsert).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleTeamEvent
// =============================================================================
describe("handleTeamEvent", () => {
  const team = { id: 5, name: "backend", slug: "backend", permission: "push", privacy: "closed" };

  it("records team added to repo as membership event", async () => {
    await handleTeamEvent(orgId, {
      action: "added_to_repository",
      team,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.orgMembershipEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "added" }),
      })
    );
  });

  it("records team removed from repo as membership event", async () => {
    await handleTeamEvent(orgId, {
      action: "removed_from_repository",
      team,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.orgMembershipEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "removed" }),
      })
    );
  });

  it("creates MEDIUM alert for privilege escalation (pull → admin)", async () => {
    await handleTeamEvent(orgId, {
      action: "edited",
      team: { ...team, permission: "admin" },
      changes: { permission: { from: "pull" } },
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "access_escalation",
          severity: "medium",
        }),
      })
    );
  });

  it("does NOT alert for permission reduction (admin → pull)", async () => {
    await handleTeamEvent(orgId, {
      action: "edited",
      team: { ...team, permission: "pull" },
      changes: { permission: { from: "admin" } },
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("logs unhandled team actions without DB writes", async () => {
    await handleTeamEvent(orgId, {
      action: "created",
      team,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockDb.orgMembershipEvent.create).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleSecurityAndAnalysisEvent
// =============================================================================
describe("handleSecurityAndAnalysisEvent", () => {
  it("creates HIGH alert when secret_scanning is disabled", async () => {
    await handleSecurityAndAnalysisEvent(orgId, {
      action: "changed",
      changes: {
        security_and_analysis: {
          secret_scanning: { from: "enabled", to: "disabled" },
        },
      },
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "security_feature_disabled",
          severity: "high",
        }),
      })
    );
  });

  it("creates HIGH alert when advanced_security is disabled", async () => {
    await handleSecurityAndAnalysisEvent(orgId, {
      action: "changed",
      changes: {
        security_and_analysis: {
          advanced_security: { from: "enabled", to: "disabled" },
        },
      },
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "high" }),
      })
    );
  });

  it("does NOT create alert when features are enabled", async () => {
    await handleSecurityAndAnalysisEvent(orgId, {
      action: "changed",
      changes: {
        security_and_analysis: {
          secret_scanning: { from: "disabled", to: "enabled" },
        },
      },
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it("handles missing security_and_analysis in changes gracefully", async () => {
    await handleSecurityAndAnalysisEvent(orgId, {
      action: "changed",
      changes: {},
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleDeployKeyEvent
// =============================================================================
describe("handleDeployKeyEvent", () => {
  const writeKey = {
    id: 99,
    title: "CI Deploy Key",
    key: "ssh-rsa AAAA...",
    url: "https://api.github.com/repos/acme/api/keys/99",
    verified: true,
    read_only: false,
    created_at: new Date().toISOString(),
  };

  const readOnlyKey = { ...writeKey, id: 100, read_only: true };

  it("creates MEDIUM alert for write-access deploy key", async () => {
    await handleDeployKeyEvent(orgId, {
      action: "created",
      key: writeKey,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "deploy_key_write_access",
          severity: "medium",
        }),
      })
    );
  });

  it("does NOT create alert for read-only deploy key", async () => {
    await handleDeployKeyEvent(orgId, {
      action: "created",
      key: readOnlyKey,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("resolves existing alert when deploy key is deleted", async () => {
    mockDb.complianceAlert.findFirst.mockResolvedValueOnce({ id: "alert-old" });

    await handleDeployKeyEvent(orgId, {
      action: "deleted",
      key: writeKey,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert-old" },
        data: { resolvedAt: expect.any(Date) },
      })
    );
  });

  it("skips resolution if no matching alert exists on delete", async () => {
    await handleDeployKeyEvent(orgId, {
      action: "deleted",
      key: writeKey,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.update).not.toHaveBeenCalled();
  });
});

// =============================================================================
// handleRepositoryRulesetEvent
// =============================================================================
describe("handleRepositoryRulesetEvent", () => {
  const activeRuleset = {
    id: 10,
    name: "Require PR reviews",
    target: "branch",
    enforcement: "active",
    source_type: "Repository",
    source: "acme/api",
  };

  it("creates HIGH alert when active ruleset is deleted", async () => {
    await handleRepositoryRulesetEvent(orgId, {
      action: "deleted",
      ruleset: activeRuleset,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "branch_protection_weakened",
          severity: "high",
        }),
      })
    );
  });

  it("does NOT alert when evaluate/disabled ruleset is deleted (no enforcement)", async () => {
    await handleRepositoryRulesetEvent(orgId, {
      action: "deleted",
      ruleset: { ...activeRuleset, enforcement: "evaluate" },
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
  });

  it("creates MEDIUM alert when ruleset is disabled via edit", async () => {
    await handleRepositoryRulesetEvent(orgId, {
      action: "edited",
      ruleset: { ...activeRuleset, enforcement: "disabled" },
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "branch_protection_weakened",
          severity: "medium",
        }),
      })
    );
  });

  it("only logs when ruleset is created (positive signal)", async () => {
    await handleRepositoryRulesetEvent(orgId, {
      action: "created",
      ruleset: activeRuleset,
      repository: makeRepo() as any,
      sender: { id: 1, login: "admin", type: "User" },
    } as any);

    expect(mockDb.complianceAlert.create).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
