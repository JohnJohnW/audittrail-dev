import { describe, it, expect } from "vitest";
import {
  SYNC_CONFIG,
  GITHUB_CONFIG,
  PLAN_LIMITS,
  DATA_LIMITS,
  TRENDS_CONFIG,
  EXPORT_STATUS,
  PR_STATE,
  REVIEW_STATE,
  EVIDENCE_STATUS,
  SUBSCRIPTION_PLAN,
  MEMBERSHIP_ROLE,
} from "@/lib/constants";

describe("constants", () => {
  describe("SYNC_CONFIG", () => {
    it("should have correct values", () => {
      expect(SYNC_CONFIG.MAX_PAGES).toBe(10);
      expect(SYNC_CONFIG.CRON_MAX_PAGES).toBe(3);
      expect(SYNC_CONFIG.BATCH_SIZE).toBe(25);
      expect(SYNC_CONFIG.REVIEW_LIMIT).toBe(20);
      expect(SYNC_CONFIG.CRON_REVIEW_LIMIT).toBe(10);
    });

    it("should be readonly (TypeScript const assertion)", () => {
      // `as const` makes it readonly at compile time, not frozen at runtime
      // This test verifies the values are correct and stable
      expect(SYNC_CONFIG).toMatchObject({
        MAX_PAGES: 10,
        CRON_MAX_PAGES: 3,
        BATCH_SIZE: 25,
      });
    });
  });

  describe("GITHUB_CONFIG", () => {
    it("should have correct values", () => {
      expect(GITHUB_CONFIG.API_BASE).toBe("https://api.github.com");
      expect(GITHUB_CONFIG.TIMEOUT_MS).toBe(30000);
      expect(GITHUB_CONFIG.PER_PAGE).toBe(100);
    });
  });

  describe("PLAN_LIMITS", () => {
    it("should have correct values", () => {
      expect(PLAN_LIMITS.FREE_REPO_LIMIT).toBe(2);
      expect(PLAN_LIMITS.PRO_REPO_LIMIT).toBe(Infinity);
      expect(PLAN_LIMITS.FREE_FRAMEWORK_LIMIT).toBe(2);
    });
  });

  describe("DATA_LIMITS", () => {
    it("should have positive values", () => {
      expect(DATA_LIMITS.MAX_COMMIT_MESSAGE_LENGTH).toBeGreaterThan(0);
      expect(DATA_LIMITS.MAX_PR_BODY_LENGTH).toBeGreaterThan(0);
      expect(DATA_LIMITS.MAX_REVIEW_BODY_LENGTH).toBeGreaterThan(0);
    });
  });

  describe("TRENDS_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(TRENDS_CONFIG.DEFAULT_DAYS).toBe(30);
      expect(TRENDS_CONFIG.MIN_DAYS).toBe(1);
      expect(TRENDS_CONFIG.MAX_DAYS).toBe(365);
    });

    it("should have min less than max", () => {
      expect(TRENDS_CONFIG.MIN_DAYS).toBeLessThan(TRENDS_CONFIG.MAX_DAYS);
    });

    it("should have default within min/max range", () => {
      expect(TRENDS_CONFIG.DEFAULT_DAYS).toBeGreaterThanOrEqual(TRENDS_CONFIG.MIN_DAYS);
      expect(TRENDS_CONFIG.DEFAULT_DAYS).toBeLessThanOrEqual(TRENDS_CONFIG.MAX_DAYS);
    });
  });

  describe("EXPORT_STATUS", () => {
    it("should have all status values", () => {
      expect(EXPORT_STATUS.PENDING).toBe("pending");
      expect(EXPORT_STATUS.COMPLETED).toBe("completed");
      expect(EXPORT_STATUS.FAILED).toBe("failed");
    });
  });

  describe("PR_STATE", () => {
    it("should have all state values", () => {
      expect(PR_STATE.OPEN).toBe("open");
      expect(PR_STATE.CLOSED).toBe("closed");
      expect(PR_STATE.MERGED).toBe("merged");
    });
  });

  describe("REVIEW_STATE", () => {
    it("should have all review states", () => {
      expect(REVIEW_STATE.APPROVED).toBe("APPROVED");
      expect(REVIEW_STATE.CHANGES_REQUESTED).toBe("CHANGES_REQUESTED");
      expect(REVIEW_STATE.COMMENTED).toBe("COMMENTED");
      expect(REVIEW_STATE.DISMISSED).toBe("DISMISSED");
      expect(REVIEW_STATE.PENDING).toBe("PENDING");
    });
  });

  describe("EVIDENCE_STATUS", () => {
    it("should have all status values", () => {
      expect(EVIDENCE_STATUS.HAS_EVIDENCE).toBe("has_evidence");
      expect(EVIDENCE_STATUS.PARTIAL).toBe("partial");
      expect(EVIDENCE_STATUS.LIMITED).toBe("limited");
      expect(EVIDENCE_STATUS.NO_EVIDENCE).toBe("no_evidence");
    });
  });

  describe("SUBSCRIPTION_PLAN", () => {
    it("should have free and pro plans", () => {
      expect(SUBSCRIPTION_PLAN.FREE).toBe("free");
      expect(SUBSCRIPTION_PLAN.PRO).toBe("pro");
    });
  });

  describe("MEMBERSHIP_ROLE", () => {
    it("should have all roles", () => {
      expect(MEMBERSHIP_ROLE.MEMBER).toBe("member");
      expect(MEMBERSHIP_ROLE.ADMIN).toBe("admin");
      expect(MEMBERSHIP_ROLE.OWNER).toBe("owner");
    });
  });
});
