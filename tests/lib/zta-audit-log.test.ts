import { describe, it, expect, vi, beforeEach } from "vitest";
import { ztaLog } from "@/lib/zta-audit-log";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from "@/lib/logger";

describe("zta-audit-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ztaLog", () => {
    it("calls logger.info with the [ZTA] prefix", () => {
      ztaLog({ event: "auth.session_start" });

      expect(logger.info).toHaveBeenCalledOnce();
      const [message] = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(message).toMatch(/^\[ZTA\]/);
    });

    it("includes the event type in the log message", () => {
      ztaLog({ event: "webhook.signature_invalid" });

      const [message] = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(message).toContain("webhook.signature_invalid");
    });

    it("includes orgId in the metadata when provided", () => {
      ztaLog({ event: "authz.org_mismatch", orgId: "org-abc" });

      const [, metadata] = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(metadata.orgId).toBe("org-abc");
    });

    it("includes a ts (ISO timestamp) field in the metadata", () => {
      ztaLog({ event: "export.initiated" });

      const [, metadata] = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(metadata.ts).toBeDefined();
      // Validate it is a valid ISO 8601 timestamp
      expect(() => new Date(metadata.ts as string)).not.toThrow();
      expect(new Date(metadata.ts as string).toISOString()).toBe(metadata.ts);
    });

    it("works with only the required event field and no optional fields", () => {
      expect(() => ztaLog({ event: "admin.settings_changed" })).not.toThrow();

      expect(logger.info).toHaveBeenCalledOnce();
      const [message, metadata] = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(message).toBe("[ZTA] admin.settings_changed");
      expect(metadata.event).toBe("admin.settings_changed");
      expect(metadata.orgId).toBeUndefined();
      expect(metadata.userId).toBeUndefined();
      expect(metadata.ip).toBeUndefined();
    });
  });
});
