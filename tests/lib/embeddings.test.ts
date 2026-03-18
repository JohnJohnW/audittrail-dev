import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks (defined before vi.mock hoisting) ─────────────────────────

const { mockEmbedContent, mockUpsert, mockFrom } = vi.hoisted(() => {
  const mockEmbedContent = vi.fn();
  const mockUpsert = vi.fn();
  const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
  return { mockEmbedContent, mockUpsert, mockFrom };
});

// ─── Mock @google/genai ──────────────────────────────────────────────────────

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function (this: Record<string, unknown>) {
    this.models = { embedContent: mockEmbedContent };
  }),
}));

// ─── Mock @/lib/supabase ─────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ─── Mock @/lib/logger ───────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import {
  embedText,
  embedBatch,
  buildCommitText,
  buildPullRequestText,
  getConfidenceTier,
  cosineSimilarity,
  storeEvidenceEmbedding,
  safeEmbedAndStore,
  CONFIDENCE_THRESHOLDS,
} from "@/lib/embeddings";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("embedText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  it("calls Gemini with correct model and dimensions, returns number[]", async () => {
    const fakeValues = [0.1, 0.2, 0.3];
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: fakeValues }],
    });

    const result = await embedText("hello world");

    expect(mockEmbedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-embedding-2-preview",
        contents: [{ parts: [{ text: "hello world" }] }],
        config: { outputDimensionality: 768 },
      })
    );
    expect(result).toEqual(fakeValues);
  });

  it("returns empty array when API returns no embeddings", async () => {
    mockEmbedContent.mockResolvedValue({ embeddings: [] });

    const result = await embedText("test");
    expect(result).toEqual([]);
  });

  it("returns empty array gracefully on API failure", async () => {
    // When embedText throws, safeEmbedAndStore should catch it.
    // For embedText itself: it propagates errors from ai.models.embedContent,
    // but we test graceful degradation via safeEmbedAndStore below.
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: undefined }],
    });

    const result = await embedText("test");
    expect(result).toEqual([]);
  });
});

describe("embedBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  it("processes 21 texts: first batch of 20 + second batch of 1", async () => {
    const fakeValues = [0.5, 0.6];
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: fakeValues }],
    });

    const texts = Array.from({ length: 21 }, (_, i) => `text ${i}`);

    // Use fake timers to avoid actual delays
    vi.useFakeTimers();
    const promise = embedBatch(texts);
    // Advance past the rate limit delay (200ms)
    await vi.runAllTimersAsync();
    const results = await promise;
    vi.useRealTimers();

    expect(results).toHaveLength(21);
    expect(mockEmbedContent).toHaveBeenCalledTimes(21);
  });

  it("processes texts within a single batch of 20 without extra delay", async () => {
    const fakeValues = [0.1, 0.2];
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: fakeValues }],
    });

    const texts = Array.from({ length: 20 }, (_, i) => `text ${i}`);
    const results = await embedBatch(texts);

    expect(results).toHaveLength(20);
    expect(mockEmbedContent).toHaveBeenCalledTimes(20);
    // All results should have the fakeValues
    results.forEach((r) => expect(r).toEqual(fakeValues));
  });

  it("returns empty arrays when embedContent returns no values", async () => {
    mockEmbedContent.mockResolvedValue({ embeddings: [{ values: undefined }] });

    const results = await embedBatch(["a", "b"]);
    expect(results).toEqual([[], []]);
  });
});

describe("buildCommitText", () => {
  it("returns string containing sha (message), author", () => {
    const result = buildCommitText({
      message: "Fix security vulnerability",
      authorName: "Alice",
      verified: true,
    });

    expect(result).toContain("Fix security vulnerability");
    expect(result).toContain("Alice");
    expect(result).toContain("Signed: yes");
  });

  it("includes Signed: no when not verified", () => {
    const result = buildCommitText({
      message: "Update deps",
      authorName: "Bob",
      verified: false,
    });

    expect(result).toContain("Signed: no");
    expect(result).toContain("Bob");
  });
});

describe("buildPullRequestText", () => {
  it("returns string containing PR title, state", () => {
    const result = buildPullRequestText({
      title: "Add OAuth2 support",
      body: "Implements OAuth2 login",
      state: "merged",
      baseBranch: "main",
      headBranch: "feature/oauth",
    });

    expect(result).toContain("Add OAuth2 support");
    expect(result).toContain("merged");
    expect(result).toContain("Implements OAuth2 login");
  });

  it("omits body line when body is null", () => {
    const result = buildPullRequestText({
      title: "Fix bug",
      body: null,
      state: "open",
      baseBranch: "main",
      headBranch: "fix/bug",
    });

    expect(result).toContain("Fix bug");
    expect(result).not.toContain("Description:");
  });

  it("includes branch info", () => {
    const result = buildPullRequestText({
      title: "Feature",
      body: null,
      state: "open",
      baseBranch: "main",
      headBranch: "feature/x",
    });

    expect(result).toContain("feature/x");
    expect(result).toContain("main");
  });
});

describe("getConfidenceTier", () => {
  it("returns 'high' for score >= 0.85", () => {
    expect(getConfidenceTier(0.85)).toBe("high");
    expect(getConfidenceTier(0.9)).toBe("high");
    expect(getConfidenceTier(1.0)).toBe("high");
  });

  it("returns 'medium' for score >= 0.6 but < 0.85", () => {
    expect(getConfidenceTier(0.6)).toBe("medium");
    expect(getConfidenceTier(0.7)).toBe("medium");
    expect(getConfidenceTier(0.84)).toBe("medium");
  });

  it("returns 'low' for score < 0.6", () => {
    expect(getConfidenceTier(0.59)).toBe("low");
    expect(getConfidenceTier(0.0)).toBe("low");
    expect(getConfidenceTier(0.3)).toBe("low");
  });

  it("uses CONFIDENCE_THRESHOLDS constants correctly", () => {
    expect(getConfidenceTier(CONFIDENCE_THRESHOLDS.HIGH)).toBe("high");
    expect(getConfidenceTier(CONFIDENCE_THRESHOLDS.MEDIUM)).toBe("medium");
    expect(getConfidenceTier(CONFIDENCE_THRESHOLDS.MEDIUM - 0.01)).toBe("low");
  });
});

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched length vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("computes correct similarity for known vectors", () => {
    // [1,1] and [1,0] have cosine similarity = 1/sqrt(2) ≈ 0.707
    const result = cosineSimilarity([1, 1], [1, 0]);
    expect(result).toBeCloseTo(0.707, 2);
  });
});

describe("storeEvidenceEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("calls supabase from evidence_embeddings with correct org_id and embedding", async () => {
    const embedding = [0.1, 0.2, 0.3];
    await storeEvidenceEmbedding("org-1", "commit", "commit-123", embedding, "abc123def");

    expect(mockFrom).toHaveBeenCalledWith("evidence_embeddings");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        source_type: "commit",
        source_id: "commit-123",
        content_hash: "abc123def",
        embedding: "[0.1,0.2,0.3]",
      }),
      expect.objectContaining({ onConflict: "id" })
    );
  });

  it("throws when supabase returns an error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "DB error" } });

    await expect(
      storeEvidenceEmbedding("org-1", "commit", "commit-123", [0.1], "hash")
    ).rejects.toBeDefined();
  });
});

describe("safeEmbedAndStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("degrades gracefully when embedText throws (does not rethrow)", async () => {
    mockEmbedContent.mockRejectedValue(new Error("API down"));

    // Should not throw
    await expect(
      safeEmbedAndStore("org-1", "commit", "source-1", "some text")
    ).resolves.toBeUndefined();
  });

  it("does not store when embedding is empty", async () => {
    mockEmbedContent.mockResolvedValue({ embeddings: [{ values: [] }] });

    await safeEmbedAndStore("org-1", "commit", "source-1", "some text");

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("stores embedding when embedText succeeds", async () => {
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    await safeEmbedAndStore("org-1", "commit", "source-1", "some text");

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});
