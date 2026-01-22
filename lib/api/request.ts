/**
 * API Request Helpers
 *
 * Utilities for parsing and validating API request data.
 */

import { AppError } from "@/lib/error-handler";

/**
 * Parse JSON body from request with error handling.
 *
 * @param request - The incoming request
 * @throws AppError with 400 if JSON is invalid
 * @returns Parsed JSON body
 *
 * @example
 * ```typescript
 * interface CreateRepoBody {
 *   repositoryIds: number[];
 * }
 *
 * const body = await parseJsonBody<CreateRepoBody>(request);
 * ```
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new AppError("Invalid JSON body", 400, "INVALID_JSON");
  }
}

/**
 * Parse optional JSON body - returns null if no body provided.
 *
 * @param request - The incoming request
 * @returns Parsed JSON body or null
 */
export async function parseOptionalJsonBody<T>(
  request: Request
): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    throw new AppError("Invalid JSON body", 400, "INVALID_JSON");
  }
}

/**
 * Get query parameter with optional default value.
 *
 * @param url - Request URL or URLSearchParams
 * @param param - Parameter name
 * @param defaultValue - Default value if not provided
 * @returns Parameter value or default
 */
export function getQueryParam(
  url: URL | URLSearchParams,
  param: string,
  defaultValue?: string
): string | undefined {
  try {
    let params: URLSearchParams;
    if (url instanceof URL) {
      params = url.searchParams;
    } else if (url instanceof URLSearchParams) {
      params = url;
    } else {
      // Fallback: try to create URLSearchParams from string or object
      console.warn("getQueryParam: Invalid URL type, attempting fallback", typeof url);
      return defaultValue;
    }
    return params.get(param) ?? defaultValue;
  } catch (error) {
    console.error("getQueryParam error:", error);
    return defaultValue;
  }
}

/**
 * Get numeric query parameter with bounds checking.
 *
 * @param url - Request URL or URLSearchParams
 * @param param - Parameter name
 * @param options - Options for parsing
 * @returns Parsed number or default
 */
export function getNumericQueryParam(
  url: URL | URLSearchParams,
  param: string,
  options: {
    defaultValue: number;
    min?: number;
    max?: number;
  }
): number {
  const params = url instanceof URL ? url.searchParams : url;
  const value = params.get(param);

  if (!value) {
    return options.defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return options.defaultValue;
  }

  let result = parsed;
  if (options.min !== undefined) {
    result = Math.max(result, options.min);
  }
  if (options.max !== undefined) {
    result = Math.min(result, options.max);
  }

  return result;
}
