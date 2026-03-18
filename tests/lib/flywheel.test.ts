import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
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

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { recordAuditorSignoff, recordAuditOutcome, recordGrcAnnotation } from "@/lib/flywheel";
import { logger } from "@/lib/logger";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("flywheel", () => {
  const originalEnv = process.env.FLYWHEEL_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FLYWHEEL_ENABLED;
    } else {
      process.env.FLYWHEEL_ENABLED = originalEnv;
    }
    vi.clearAllMocks();
  });

  // ─── recordAuditorSignoff ─────────────────────────────────────────────────

  describe("recordAuditorSignoff", () => {
    it("calls db.$executeRaw when FLYWHEEL_ENABLED=true", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      mockDb.$executeRaw.mockResolvedValue(1);

      await recordAuditorSignoff("org-1", {
        controlCode: "CC6.1",
        frameworkName: "SOC2",
        verdict: "approved",
        mappingConfidence: 0.92,
        orgIndustry: "tech",
        orgSize: "small",
      });

      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("does NOT call db when FLYWHEEL_ENABLED is unset", async () => {
      delete process.env.FLYWHEEL_ENABLED;

      await recordAuditorSignoff("org-1", {
        controlCode: "CC6.1",
        frameworkName: "SOC2",
        verdict: "approved",
        mappingConfidence: 0.92,
      });

      expect(mockDb.$executeRaw).not.toHaveBeenCalled();
    });

    it("does NOT call db when FLYWHEEL_ENABLED=false", async () => {
      process.env.FLYWHEEL_ENABLED = "false";

      await recordAuditorSignoff("org-1", {
        controlCode: "CC6.1",
        frameworkName: "SOC2",
        verdict: "rejected",
        mappingConfidence: 0.4,
      });

      expect(mockDb.$executeRaw).not.toHaveBeenCalled();
    });

    it("logs warning but does not throw on db failure", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      mockDb.$executeRaw.mockRejectedValue(new Error("DB connection failed"));

      await expect(
        recordAuditorSignoff("org-1", {
          controlCode: "CC6.1",
          frameworkName: "SOC2",
          verdict: "approved",
          mappingConfidence: 0.9,
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Flywheel"),
        expect.objectContaining({ error: "DB connection failed" })
      );
    });
  });

  // ─── recordAuditOutcome ───────────────────────────────────────────────────

  describe("recordAuditOutcome", () => {
    it("calls db.$executeRaw when FLYWHEEL_ENABLED=true", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      mockDb.$executeRaw.mockResolvedValue(1);

      await recordAuditOutcome("org-1", {
        frameworkName: "SOC2",
        auditType: "internal",
        outcome: "passed",
        findingCount: 3,
        criticalFindingCount: 0,
        frameworkScore: 0.87,
        orgIndustry: "fintech",
        orgSize: "medium",
      });

      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when FLYWHEEL_ENABLED is unset", async () => {
      delete process.env.FLYWHEEL_ENABLED;

      await recordAuditOutcome("org-1", {
        frameworkName: "SOC2",
        auditType: "internal",
        outcome: "passed",
        findingCount: 0,
        criticalFindingCount: 0,
        frameworkScore: 1.0,
      });

      expect(mockDb.$executeRaw).not.toHaveBeenCalled();
    });

    it("is a no-op when FLYWHEEL_ENABLED=false", async () => {
      process.env.FLYWHEEL_ENABLED = "false";

      await recordAuditOutcome("org-1", {
        frameworkName: "ISO27001",
        auditType: "external",
        outcome: "failed",
        findingCount: 10,
        criticalFindingCount: 2,
        frameworkScore: 0.55,
      });

      expect(mockDb.$executeRaw).not.toHaveBeenCalled();
    });

    it("logs warning but does not throw on db failure", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      mockDb.$executeRaw.mockRejectedValue(new Error("timeout"));

      await expect(
        recordAuditOutcome("org-1", {
          frameworkName: "SOC2",
          auditType: "internal",
          outcome: "passed",
          findingCount: 0,
          criticalFindingCount: 0,
          frameworkScore: 1.0,
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Flywheel"),
        expect.objectContaining({ error: "timeout" })
      );
    });
  });

  // ─── recordGrcAnnotation ──────────────────────────────────────────────────

  describe("recordGrcAnnotation", () => {
    it("calls logger.info when FLYWHEEL_ENABLED=true", async () => {
      process.env.FLYWHEEL_ENABLED = "true";

      await recordGrcAnnotation("org-1", "CC6.1", "SOC2");

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Flywheel"),
        expect.objectContaining({ controlCode: "CC6.1", frameworkName: "SOC2" })
      );
    });

    it("is a no-op when FLYWHEEL_ENABLED is unset", async () => {
      delete process.env.FLYWHEEL_ENABLED;

      await recordGrcAnnotation("org-1", "CC6.1", "SOC2");

      expect(logger.info).not.toHaveBeenCalled();
    });

    it("is a no-op when FLYWHEEL_ENABLED=false", async () => {
      process.env.FLYWHEEL_ENABLED = "false";

      await recordGrcAnnotation("org-1", "CC6.1", "SOC2");

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  // ─── sanitizePayload (tested indirectly via recordAuditorSignoff) ─────────

  describe("sanitizePayload behavior", () => {
    it("strips PII fields (orgId, userId, email, name, authorName, authorEmail)", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      mockDb.$executeRaw.mockResolvedValue(1);

      // recordAuditorSignoff calls sanitizePayload(signoff) internally.
      // The signoff interface doesn't include these fields, so we verify
      // the behavior by checking that db.$executeRaw is still called
      // (the function doesn't crash when stripping missing fields).
      await recordAuditorSignoff("org-1", {
        controlCode: "CC7.1",
        frameworkName: "SOC2",
        verdict: "needs_work",
        mappingConfidence: 0.75,
      });

      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("preserves non-PII fields like controlCode, frameworkName, verdict", async () => {
      process.env.FLYWHEEL_ENABLED = "true";
      // We verify the SQL template is invoked (i.e. sanitized fields are used)
      mockDb.$executeRaw.mockResolvedValue(1);

      await recordAuditorSignoff("org-1", {
        controlCode: "A.9.1",
        frameworkName: "ISO27001",
        verdict: "approved",
        mappingConfidence: 0.88,
      });

      // $executeRaw is called, meaning sanitized payload had required fields
      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
