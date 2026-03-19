import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEvidenceSummary } from "@/lib/compliance";
import type { ControlEvidence } from "@/types/compliance";

// Mock heavy dependencies so the module can be imported in a unit test context
vi.mock("@/lib/db", () => ({
  db: {
    complianceFramework: { findMany: vi.fn() },
    repository: { findMany: vi.fn() },
    agentEvent: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helpers to build minimal ControlEvidence objects for testing
function makeControl(
  overrides: Partial<ControlEvidence> & { status: ControlEvidence["status"] }
): ControlEvidence {
  return {
    controlId: "ctrl-1",
    controlCode: "A.8.9",
    controlTitle: "Configuration Management",
    controlDescription: null,
    frameworkName: "ISO 27001",
    evidenceType: "branch_protection",
    evidenceCount: 0,
    evidence: [],
    ...overrides,
  };
}

describe("getEvidenceSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero values for an empty array", () => {
    const result = getEvidenceSummary([]);

    expect(result).toEqual({
      score: 0,
      total: 0,
      withEvidence: 0,
      partial: 0,
      limited: 0,
      noEvidence: 0,
    });
  });

  it("returns score of 100 when all controls have evidence", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "has_evidence" }),
      makeControl({ controlId: "c3", status: "has_evidence" }),
      makeControl({ controlId: "c4", status: "has_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.total).toBe(4);
    expect(result.withEvidence).toBe(4);
    expect(result.score).toBe(100);
    expect(result.partial).toBe(0);
    expect(result.limited).toBe(0);
    expect(result.noEvidence).toBe(0);
  });

  it("returns score of 0 when no controls have evidence", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "no_evidence" }),
      makeControl({ controlId: "c2", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.score).toBe(0);
    expect(result.withEvidence).toBe(0);
    expect(result.noEvidence).toBe(2);
  });

  it("returns approximately 50 when half the controls have evidence", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "has_evidence" }),
      makeControl({ controlId: "c3", status: "no_evidence" }),
      makeControl({ controlId: "c4", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.total).toBe(4);
    expect(result.withEvidence).toBe(2);
    expect(result.noEvidence).toBe(2);
    expect(result.score).toBe(50);
  });

  it("counts partial evidence separately from full evidence", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "partial" }),
      makeControl({ controlId: "c3", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.withEvidence).toBe(1);
    expect(result.partial).toBe(1);
    expect(result.noEvidence).toBe(1);
    // Score: (1 full + 1 partial * 0.5) / 3 = 1.5/3 = 50
    expect(result.score).toBe(50);
  });

  it("counts limited controls separately and treats them like partial in the score", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "limited" }),
      makeControl({ controlId: "c3", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.limited).toBe(1);
    expect(result.partial).toBe(0);
    // Score: (1 + 1 * 0.5) / 3 = 1.5/3 = 50
    expect(result.score).toBe(50);
  });

  it("handles a mix of all four statuses", () => {
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "has_evidence" }),
      makeControl({ controlId: "c3", status: "partial" }),
      makeControl({ controlId: "c4", status: "limited" }),
      makeControl({ controlId: "c5", status: "no_evidence" }),
      makeControl({ controlId: "c6", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.total).toBe(6);
    expect(result.withEvidence).toBe(2);
    expect(result.partial).toBe(1);
    expect(result.limited).toBe(1);
    expect(result.noEvidence).toBe(2);
    // Score: (2 + (1+1) * 0.5) / 6 = (2 + 1) / 6 = 3/6 = 50
    expect(result.score).toBe(50);
  });

  it("returns an integer score (rounds with Math.round)", () => {
    // 2 has_evidence out of 3 = 66.67 -> rounds to 67
    const controls: ControlEvidence[] = [
      makeControl({ controlId: "c1", status: "has_evidence" }),
      makeControl({ controlId: "c2", status: "has_evidence" }),
      makeControl({ controlId: "c3", status: "no_evidence" }),
    ];

    const result = getEvidenceSummary(controls);

    expect(result.score).toBe(67);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it("returns total equal to the number of controls passed in", () => {
    const controls = Array.from({ length: 10 }, (_, i) =>
      makeControl({ controlId: `c${i}`, status: "no_evidence" })
    );

    const result = getEvidenceSummary(controls);

    expect(result.total).toBe(10);
  });
});
