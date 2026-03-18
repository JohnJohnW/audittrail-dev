import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handlePushEvent,
  handlePullRequestEvent,
  handlePullRequestReviewEvent,
  handleMemberEvent,
  handleOrganizationEvent,
} from "@/lib/webhook-handlers";

// Mock dependencies
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
  commit: {
    upsert: vi.fn(),
  },
  pullRequest: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  review: {
    upsert: vi.fn(),
  },
  orgMembershipEvent: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("webhook-handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handlePushEvent", () => {
    it("should upsert commits from push payload", async () => {
      mockDb.repository.findFirst.mockResolvedValue({
        id: "repo-1",
        orgId: "org-1",
        fullName: "owner/repo",
        defaultBranch: "main",
      });
      mockDb.commit.upsert.mockResolvedValue({});
      mockDb.repository.update.mockResolvedValue({});

      await handlePushEvent("org-1", {
        ref: "refs/heads/main",
        before: "abc",
        after: "def",
        repository: {
          id: 123,
          name: "repo",
          full_name: "owner/repo",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/owner/repo",
        },
        sender: { id: 1, login: "user", type: "User" },
        commits: [
          {
            id: "abc123",
            message: "Fix security vulnerability",
            timestamp: "2024-01-01T00:00:00Z",
            url: "https://github.com/owner/repo/commit/abc123",
            author: { name: "Test User", email: "test@example.com" },
            committer: { name: "Test User", email: "test@example.com" },
            added: [],
            removed: [],
            modified: ["src/auth.ts"],
          },
        ],
        head_commit: null,
      });

      expect(mockDb.commit.upsert).toHaveBeenCalledTimes(1);
      expect(mockDb.commit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repoId_sha: { repoId: "repo-1", sha: "abc123" } },
          create: expect.objectContaining({
            repoId: "repo-1",
            sha: "abc123",
            authorName: "Test User",
          }),
        })
      );
      expect(mockDb.repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "repo-1" },
          data: expect.objectContaining({ lastWebhookAt: expect.any(Date) }),
        })
      );
    });

    it("should skip if repo not found", async () => {
      mockDb.repository.findFirst.mockResolvedValue(null);

      await handlePushEvent("org-1", {
        ref: "refs/heads/main",
        before: "abc",
        after: "def",
        repository: {
          id: 123,
          name: "repo",
          full_name: "unknown/repo",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/unknown/repo",
        },
        sender: { id: 1, login: "user", type: "User" },
        commits: [
          {
            id: "abc",
            message: "test",
            timestamp: "2024-01-01T00:00:00Z",
            url: "",
            author: { name: "Test", email: "test@test.com" },
            committer: { name: "Test", email: "test@test.com" },
            added: [],
            removed: [],
            modified: [],
          },
        ],
        head_commit: null,
      });

      expect(mockDb.commit.upsert).not.toHaveBeenCalled();
    });
  });

  describe("handlePullRequestEvent", () => {
    it("should upsert PR from webhook payload", async () => {
      mockDb.repository.findFirst.mockResolvedValue({
        id: "repo-1",
        orgId: "org-1",
        fullName: "owner/repo",
        defaultBranch: "main",
      });
      mockDb.pullRequest.upsert.mockResolvedValue({});
      mockDb.repository.update.mockResolvedValue({});

      await handlePullRequestEvent("org-1", {
        action: "closed",
        number: 42,
        pull_request: {
          id: 999,
          number: 42,
          title: "Add authentication",
          body: "Implements OAuth2",
          state: "closed",
          user: { id: 1, login: "dev", type: "User" },
          html_url: "https://github.com/owner/repo/pull/42",
          merged_at: "2024-01-15T00:00:00Z",
          closed_at: "2024-01-15T00:00:00Z",
          base: { ref: "main" },
          head: { ref: "feature/auth" },
        },
        repository: {
          id: 123,
          name: "repo",
          full_name: "owner/repo",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/owner/repo",
        },
        sender: { id: 1, login: "dev", type: "User" },
      });

      expect(mockDb.pullRequest.upsert).toHaveBeenCalledTimes(1);
      expect(mockDb.pullRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repoId_githubPrId: { repoId: "repo-1", githubPrId: BigInt(999) } },
          create: expect.objectContaining({
            repoId: "repo-1",
            number: 42,
            title: "Add authentication",
            state: "merged",
          }),
        })
      );
    });
  });

  describe("handleMemberEvent", () => {
    it("should record member added event", async () => {
      mockDb.orgMembershipEvent.create.mockResolvedValue({});

      await handleMemberEvent("org-1", {
        action: "added",
        member: { id: 42, login: "newdev", type: "User" },
        sender: { id: 1, login: "admin", type: "User" },
      });

      expect(mockDb.orgMembershipEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: "org-1",
          githubLogin: "newdev",
          githubUserId: 42,
          action: "added",
        }),
      });
    });

    it("should record member removed event", async () => {
      mockDb.orgMembershipEvent.create.mockResolvedValue({});

      await handleMemberEvent("org-1", {
        action: "removed",
        member: { id: 42, login: "olddev", type: "User" },
        sender: { id: 1, login: "admin", type: "User" },
      });

      expect(mockDb.orgMembershipEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "removed",
          githubLogin: "olddev",
        }),
      });
    });
  });

  describe("handleOrganizationEvent", () => {
    it("should record organization member_added event", async () => {
      mockDb.orgMembershipEvent.create.mockResolvedValue({});

      await handleOrganizationEvent("org-1", {
        action: "member_added",
        membership: {
          user: { id: 42, login: "newmember", type: "User" },
          role: "member",
          organization: { id: 100, login: "myorg" },
        },
        organization: { id: 100, login: "myorg" },
        sender: { id: 1, login: "admin", type: "User" },
      });

      expect(mockDb.orgMembershipEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: "org-1",
          githubLogin: "newmember",
          action: "added",
          role: "member",
        }),
      });
    });

    it("should skip events without membership data", async () => {
      await handleOrganizationEvent("org-1", {
        action: "renamed",
        organization: { id: 100, login: "myorg" },
        sender: { id: 1, login: "admin", type: "User" },
      });

      expect(mockDb.orgMembershipEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("handlePullRequestReviewEvent", () => {
    it("should upsert review when PR exists in DB", async () => {
      mockDb.repository.findFirst.mockResolvedValue({
        id: "repo-1",
        orgId: "org-1",
        fullName: "owner/repo",
        defaultBranch: "main",
      });
      mockDb.pullRequest.findUnique.mockResolvedValue({ id: "pr-1" });
      mockDb.review.upsert.mockResolvedValue({});
      mockDb.repository.update.mockResolvedValue({});

      await handlePullRequestReviewEvent("org-1", {
        action: "submitted",
        review: {
          id: 555,
          user: { id: 2, login: "reviewer", type: "User" },
          body: "LGTM",
          state: "APPROVED",
          submitted_at: "2024-01-15T12:00:00Z",
          html_url: "https://github.com/owner/repo/pull/42#pullrequestreview-555",
        },
        pull_request: {
          id: 999,
          number: 42,
          title: "Feature",
          body: null,
          state: "open",
          user: { id: 1, login: "dev", type: "User" },
          html_url: "https://github.com/owner/repo/pull/42",
          merged_at: null,
          closed_at: null,
          base: { ref: "main" },
          head: { ref: "feature" },
        },
        repository: {
          id: 123,
          name: "repo",
          full_name: "owner/repo",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/owner/repo",
        },
        sender: { id: 2, login: "reviewer", type: "User" },
      });

      expect(mockDb.review.upsert).toHaveBeenCalledTimes(1);
      expect(mockDb.review.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { prId_githubReviewId: { prId: "pr-1", githubReviewId: BigInt(555) } },
          create: expect.objectContaining({
            reviewerLogin: "reviewer",
            state: "APPROVED",
          }),
        })
      );
    });

    it("should skip if PR not found in DB", async () => {
      mockDb.repository.findFirst.mockResolvedValue({
        id: "repo-1",
        orgId: "org-1",
        fullName: "owner/repo",
        defaultBranch: "main",
      });
      mockDb.pullRequest.findUnique.mockResolvedValue(null);

      await handlePullRequestReviewEvent("org-1", {
        action: "submitted",
        review: {
          id: 555,
          user: { id: 2, login: "reviewer", type: "User" },
          body: "LGTM",
          state: "APPROVED",
          submitted_at: "2024-01-15T12:00:00Z",
          html_url: "",
        },
        pull_request: {
          id: 999,
          number: 42,
          title: "Feature",
          body: null,
          state: "open",
          user: { id: 1, login: "dev", type: "User" },
          html_url: "",
          merged_at: null,
          closed_at: null,
          base: { ref: "main" },
          head: { ref: "feature" },
        },
        repository: {
          id: 123,
          name: "repo",
          full_name: "owner/repo",
          private: false,
          default_branch: "main",
          html_url: "",
        },
        sender: { id: 2, login: "reviewer", type: "User" },
      });

      expect(mockDb.review.upsert).not.toHaveBeenCalled();
    });
  });
});
