import { describe, it, expect } from "vitest";
import { POSTHOG_CONFIG, FUNNEL_EVENTS } from "@/lib/posthog";

describe("posthog", () => {
  describe("POSTHOG_CONFIG", () => {
    it("has an api_host property", () => {
      expect(POSTHOG_CONFIG).toHaveProperty("api_host");
      expect(typeof POSTHOG_CONFIG.api_host).toBe("string");
    });

    it("has respect_dnt set to true", () => {
      expect(POSTHOG_CONFIG.respect_dnt).toBe(true);
    });

    it("has capture_pageview set to false (manual control)", () => {
      expect(POSTHOG_CONFIG.capture_pageview).toBe(false);
    });

    it("has session_recording with maskAllInputs enabled", () => {
      expect(POSTHOG_CONFIG.session_recording).toBeDefined();
      expect(POSTHOG_CONFIG.session_recording.maskAllInputs).toBe(true);
    });
  });

  describe("FUNNEL_EVENTS", () => {
    it("contains SIGNUP_COMPLETED key", () => {
      expect(FUNNEL_EVENTS).toHaveProperty("SIGNUP_COMPLETED");
    });

    it("contains PRO_UPGRADE_COMPLETED key", () => {
      expect(FUNNEL_EVENTS).toHaveProperty("PRO_UPGRADE_COMPLETED");
    });

    it("contains GITHUB_APP_INSTALLED key", () => {
      expect(FUNNEL_EVENTS).toHaveProperty("GITHUB_APP_INSTALLED");
    });

    it("contains FIRST_SYNC_COMPLETED key", () => {
      expect(FUNNEL_EVENTS).toHaveProperty("FIRST_SYNC_COMPLETED");
    });

    it("all FUNNEL_EVENTS values are strings", () => {
      for (const [key, value] of Object.entries(FUNNEL_EVENTS)) {
        expect(typeof value, `FUNNEL_EVENTS.${key} should be a string`).toBe("string");
      }
    });

    it("no event name values contain 'email'", () => {
      for (const [key, value] of Object.entries(FUNNEL_EVENTS)) {
        expect(
          (value as string).toLowerCase(),
          `FUNNEL_EVENTS.${key} should not contain 'email'`
        ).not.toContain("email");
      }
    });

    it("no event name values contain 'user'", () => {
      for (const [key, value] of Object.entries(FUNNEL_EVENTS)) {
        expect(
          (value as string).toLowerCase(),
          `FUNNEL_EVENTS.${key} should not contain 'user'`
        ).not.toContain("user");
      }
    });

    it("no event name values contain 'name'", () => {
      for (const [key, value] of Object.entries(FUNNEL_EVENTS)) {
        expect(
          (value as string).toLowerCase(),
          `FUNNEL_EVENTS.${key} should not contain 'name'`
        ).not.toContain("name");
      }
    });
  });
});
