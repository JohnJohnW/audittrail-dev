import { describe, it, expect } from "vitest";
import { cn, escapeHtml, isValidCuid, isValidDateString, clamp } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", true && "active", false && "disabled")).toBe("base active");
    });

    it("should deduplicate tailwind classes", () => {
      expect(cn("p-4", "p-6")).toBe("p-6");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("should handle objects", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("should handle empty inputs", () => {
      expect(cn()).toBe("");
      expect(cn("")).toBe("");
      expect(cn(null, undefined)).toBe("");
    });
  });

  describe("escapeHtml", () => {
    it("should escape ampersand", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("should escape less than", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("should escape greater than", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b");
    });

    it("should escape double quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("should escape single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#039;s");
    });

    it("should escape all special characters together", () => {
      expect(escapeHtml('<a href="test">Tom & Jerry\'s</a>')).toBe(
        "&lt;a href=&quot;test&quot;&gt;Tom &amp; Jerry&#039;s&lt;/a&gt;"
      );
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle string with no special characters", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });
  });

  describe("isValidCuid", () => {
    it("should return true for valid CUIDs", () => {
      expect(isValidCuid("cm1234567890123456789")).toBe(true);
      expect(isValidCuid("clpn3jq7a0000mc04y8mj9dqz")).toBe(true);
    });

    it("should return false for CUIDs not starting with c", () => {
      expect(isValidCuid("am1234567890123456789")).toBe(false);
      expect(isValidCuid("1m1234567890123456789")).toBe(false);
    });

    it("should return false for too short strings", () => {
      expect(isValidCuid("cm12345678901234567")).toBe(false);
      expect(isValidCuid("c")).toBe(false);
    });

    it("should reject uppercase CUIDs (CUIDs are always lowercase by spec)", () => {
      expect(isValidCuid("CM1234567890123456789")).toBe(false);
      expect(isValidCuid("Cm1234567890123456789")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidCuid("")).toBe(false);
    });

    it("should return false for strings with special characters", () => {
      expect(isValidCuid("cm123456789012345678!")).toBe(false);
      expect(isValidCuid("cm123456789_123456789")).toBe(false);
    });
  });

  describe("isValidDateString", () => {
    it("should return true for valid ISO date strings", () => {
      expect(isValidDateString("2024-01-01")).toBe(true);
      expect(isValidDateString("2024-01-01T00:00:00.000Z")).toBe(true);
      expect(isValidDateString("2024-12-31T23:59:59.999Z")).toBe(true);
    });

    it("should return true for various date formats", () => {
      expect(isValidDateString("January 1, 2024")).toBe(true);
      expect(isValidDateString("01/01/2024")).toBe(true);
      expect(isValidDateString("2024/01/01")).toBe(true);
    });

    it("should return false for invalid date strings", () => {
      expect(isValidDateString("not a date")).toBe(false);
      expect(isValidDateString("")).toBe(false);
      expect(isValidDateString("2024-13-01")).toBe(false); // Invalid month
      expect(isValidDateString("abc123")).toBe(false);
    });

    it("should return false for completely invalid formats", () => {
      expect(isValidDateString("invalid")).toBe(false);
    });
  });

  describe("clamp", () => {
    it("should return value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should return min when value is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });

    it("should work with negative ranges", () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it("should work with decimal values", () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.5, 0, 1)).toBe(0);
    });

    it("should handle edge case where min equals max", () => {
      expect(clamp(5, 5, 5)).toBe(5);
      expect(clamp(0, 5, 5)).toBe(5);
      expect(clamp(10, 5, 5)).toBe(5);
    });
  });
});
