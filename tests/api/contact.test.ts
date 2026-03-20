import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted so the mock function is available inside the vi.mock factory
const mockSendFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { id: "email-id" }, error: null })
);

vi.mock("resend", () => {
  class Resend {
    emails = { send: mockSendFn };

    constructor(_apiKey?: string) {}
  }
  return { Resend };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import route after mocks are in place
import { POST } from "@/app/api/contact/route";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendFn.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  describe("validation", () => {
    it("returns 400 when name is missing", async () => {
      const req = makeRequest({ email: "user@example.com", message: "Hello" });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/name/i);
    });

    it("returns 400 when email is missing", async () => {
      const req = makeRequest({ name: "Alice", message: "Hello" });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when message is missing", async () => {
      const req = makeRequest({ name: "Alice", email: "alice@example.com" });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when all required fields are missing", async () => {
      const req = makeRequest({});
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 when only company is provided (name/email/message missing)", async () => {
      const req = makeRequest({ company: "Acme" });
      const response = await POST(req);

      expect(response.status).toBe(400);
    });
  });

  describe("email format validation", () => {
    it("returns 400 for an email without @ symbol", async () => {
      const req = makeRequest({ name: "Alice", email: "notanemail", message: "Hello" });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/email/i);
    });

    it("returns 400 for an email missing the domain part", async () => {
      const req = makeRequest({ name: "Alice", email: "alice@", message: "Hello" });
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 for an email missing the local part", async () => {
      const req = makeRequest({ name: "Alice", email: "@example.com", message: "Hello" });
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("accepts a valid email address", async () => {
      const req = makeRequest({
        name: "Alice",
        email: "alice@example.com",
        message: "Hello there",
      });
      const response = await POST(req);

      // Should not be a 400 (may be 200 or 500 depending on env; we just confirm no validation error)
      expect(response.status).not.toBe(400);
    });
  });

  describe("successful submission", () => {
    it("returns 200 with success:true for a valid submission", async () => {
      const req = makeRequest({
        name: "Alice",
        email: "alice@example.com",
        message: "I have a question about pricing.",
      });
      const response = await POST(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("calls Resend twice: once for the team, once for the submitter", async () => {
      const req = makeRequest({
        name: "Bob",
        email: "bob@example.com",
        message: "Interested in the Pro plan.",
      });
      await POST(req);

      expect(mockSendFn).toHaveBeenCalledTimes(2);
    });

    it("sends to hello@audit-trail.net as the primary recipient", async () => {
      const req = makeRequest({
        name: "Carol",
        email: "carol@example.com",
        message: "Security review question.",
      });
      await POST(req);

      const firstCall = mockSendFn.mock.calls[0][0];
      expect(firstCall.to).toContain("hello@audit-trail.net");
    });

    it("sends a confirmation to the submitter's email", async () => {
      const req = makeRequest({
        name: "Dave",
        email: "dave@example.com",
        message: "Partnership enquiry.",
      });
      await POST(req);

      const secondCall = mockSendFn.mock.calls[1][0];
      expect(secondCall.to).toContain("dave@example.com");
    });

    it("includes the submitter name in the reply-to header", async () => {
      const req = makeRequest({
        name: "Eve",
        email: "eve@example.com",
        message: "Demo request.",
      });
      await POST(req);

      const firstCall = mockSendFn.mock.calls[0][0];
      expect(firstCall.replyTo).toBe("eve@example.com");
    });

    it("uses the correct from address", async () => {
      const req = makeRequest({
        name: "Frank",
        email: "frank@example.com",
        message: "Hello.",
      });
      await POST(req);

      const firstCall = mockSendFn.mock.calls[0][0];
      // Falls back to the default when EMAIL_FROM env is not set in test
      expect(firstCall.from).toMatch(/audit-trail/i);
    });

    it("accepts optional fields (company, subject, inquiryType) without error", async () => {
      const req = makeRequest({
        name: "Grace",
        email: "grace@example.com",
        message: "Full form submission.",
        company: "Acme Corp",
        subject: "Custom subject",
        inquiryType: "Partnership",
      });
      const response = await POST(req);

      expect(response.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("returns 500 when Resend throws", async () => {
      mockSendFn.mockRejectedValueOnce(new Error("Resend API error"));

      const req = makeRequest({
        name: "Harry",
        email: "harry@example.com",
        message: "Test message.",
      });
      const response = await POST(req);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });
  });
});
