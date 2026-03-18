import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  requireAuth: mockRequireAuth,
}));

const mockDb = vi.hoisted(() => ({
  complianceSnapshot: {
    findFirst: vi.fn(),
  },
  complianceControl: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

const { mockHandleApiError } = vi.hoisted(() => ({
  mockHandleApiError: vi.fn(),
}));

vi.mock("@/lib/error-handler", () => ({
  handleApiError: mockHandleApiError,
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) {
      super(message);
      this.statusCode = statusCode;
      this.name = "AppError";
    }
  },
}));

// ─── Import route handler AFTER mocks ────────────────────────────────────────

import { GET } from "@/app/api/dashboards/zta/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeControl(code: string, frameworkName: string, evidenceType = "branch_protection") {
  return {
    code,
    title: `Title for ${code}`,
    evidenceType,
    framework: { name: frameworkName },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/dashboards/zta", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireAuth.mockResolvedValue({ orgId: "org-123" });
    mockDb.complianceSnapshot.findFirst.mockResolvedValue(null);
    mockDb.complianceControl.findMany.mockResolvedValue([
      makeControl("ZTA-ID", "NIST SP 800-207"),
      makeControl("ZTA-T5", "NIST SP 800-207"),
      makeControl("MDA-F1", "ASD MDA Foundations"),
      makeControl("MDA-F2", "ASD MDA Foundations"),
      makeControl("ZTA-CDM", "NIST SP 800-207"),
      makeControl("ZTA-T4", "NIST SP 800-207"),
      makeControl("ZTA-T1", "NIST SP 800-207"),
      makeControl("ZTA-PE", "NIST SP 800-207"),
      makeControl("ZTA-T2", "NIST SP 800-207"),
      makeControl("ZTA-T3", "NIST SP 800-207"),
      makeControl("MDA-F7", "ASD MDA Foundations"),
      makeControl("ZTA-T6", "NIST SP 800-207"),
      makeControl("ZTA-TI", "NIST SP 800-207"),
      makeControl("MDA-F10", "ASD MDA Foundations"),
    ]);
  });

  it("returns 401 when requireAuth throws", async () => {
    const unauthorizedResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));
    mockHandleApiError.mockReturnValue(unauthorizedResponse);

    const res = await GET();

    expect(mockHandleApiError).toHaveBeenCalledOnce();
    expect(res.status).toBe(401);
  });

  it("returns ZTA posture with pillars array when authenticated", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("pillars");
    expect(Array.isArray(body.pillars)).toBe(true);
    expect(body.pillars.length).toBeGreaterThan(0);
  });

  it("response includes frameworks array with NIST SP 800-207 and ASD MDA Foundations", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body).toHaveProperty("frameworks");
    expect(Array.isArray(body.frameworks)).toBe(true);
    expect(body.frameworks).toContain("NIST SP 800-207");
    expect(body.frameworks).toContain("ASD MDA Foundations");
  });

  it("response includes dataSourcesNeeded object", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body).toHaveProperty("dataSourcesNeeded");
    expect(typeof body.dataSourcesNeeded).toBe("object");
    expect(body.dataSourcesNeeded).not.toBeNull();
  });

  it("response includes pillars array with expected pillar names", async () => {
    const res = await GET();
    const body = await res.json();

    const pillarNames: string[] = body.pillars.map(
      (p: { pillar: string; totalControls: number; controls: unknown[] }) => p.pillar
    );

    expect(pillarNames).toContain("identity");
    expect(pillarNames).toContain("device");
    expect(pillarNames).toContain("application");
    expect(pillarNames).toContain("data");
    expect(pillarNames).toContain("network");
    expect(pillarNames).toContain("visibility");
  });

  it("response includes orgId from auth context", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body.orgId).toBe("org-123");
  });

  it("includes snapshotDate from the latest snapshot when available", async () => {
    const testDate = new Date("2025-06-01T00:00:00.000Z");
    mockDb.complianceSnapshot.findFirst.mockResolvedValue({ createdAt: testDate });

    const res = await GET();
    const body = await res.json();

    expect(body.snapshotDate).toBe(testDate.toISOString());
  });

  it("returns snapshotDate as null when no snapshot exists", async () => {
    mockDb.complianceSnapshot.findFirst.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(body.snapshotDate).toBeNull();
  });

  it("each pillar has a controls array and totalControls count", async () => {
    const res = await GET();
    const body = await res.json();

    for (const pillar of body.pillars) {
      expect(pillar).toHaveProperty("pillar");
      expect(pillar).toHaveProperty("totalControls");
      expect(pillar).toHaveProperty("controls");
      expect(Array.isArray(pillar.controls)).toBe(true);
      expect(pillar.totalControls).toBe(pillar.controls.length);
    }
  });
});
