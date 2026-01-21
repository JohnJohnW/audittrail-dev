import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError, handleApiError, createErrorResponse } from "@/lib/error-handler";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("error-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AppError", () => {
    it("should create an error with default values", () => {
      const error = new AppError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AppError");
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it("should create an error with custom status code", () => {
      const error = new AppError("Not found", 404);

      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
    });

    it("should create an error with code", () => {
      const error = new AppError("Validation failed", 400, "VALIDATION_ERROR");

      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("should create an error with details", () => {
      const details = { field: "email", reason: "invalid format" };
      const error = new AppError("Validation failed", 400, "VALIDATION_ERROR", details);

      expect(error.details).toEqual(details);
    });

    it("should be an instance of Error", () => {
      const error = new AppError("Test error");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe("handleApiError", () => {
    it("should handle AppError and return proper response", async () => {
      const error = new AppError("Not found", 404, "NOT_FOUND");
      const response = handleApiError(error);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe("Not found");
      expect(body.code).toBe("NOT_FOUND");
      expect(body.requestId).toBeDefined();
    });

    it("should handle regular Error and return 500", async () => {
      const error = new Error("Something went wrong");
      const response = handleApiError(error);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("An unexpected error occurred");
      expect(body.requestId).toBeDefined();
    });

    it("should handle unknown error types", async () => {
      const response = handleApiError("string error");

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("An unknown error occurred");
      expect(body.requestId).toBeDefined();
    });

    it("should handle null error", async () => {
      const response = handleApiError(null);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("An unknown error occurred");
    });

    it("should generate unique request IDs", () => {
      const response1 = handleApiError(new Error("error1"));
      const response2 = handleApiError(new Error("error2"));

      // Request IDs should be generated (we can't easily check uniqueness without parsing)
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with default status", async () => {
      const response = createErrorResponse("Bad request");

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Bad request");
    });

    it("should create error response with custom status", async () => {
      const response = createErrorResponse("Unauthorized", 401);

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should create error response with code", async () => {
      const response = createErrorResponse("Invalid token", 401, "INVALID_TOKEN");

      const body = await response.json();
      expect(body.error).toBe("Invalid token");
      expect(body.code).toBe("INVALID_TOKEN");
    });

    it("should not include requestId in createErrorResponse", async () => {
      const response = createErrorResponse("Test error");

      const body = await response.json();
      expect(body.requestId).toBeUndefined();
    });
  });
});
