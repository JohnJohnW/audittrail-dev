import { NextResponse } from "next/server";
import { logger } from "./logger";

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Generate request ID for tracking - use fallback if crypto not available
  let requestId: string;
  try {
    requestId = crypto.randomUUID();
  } catch {
    requestId = `err-${Date.now().toString(36)}-${process.pid.toString(36)}`;
  }

  if (error instanceof AppError) {
    logger.error(`API Error [${error.statusCode}]: ${error.message}`, error, {
      requestId,
      code: error.code,
    });

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        requestId,
        // Only include details in development, never in production
        ...(!isProduction && error.details && { details: error.details }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Log full error internally but don't expose to client in production
    logger.error(`Unexpected error: ${error.message}`, error, { requestId });

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        requestId,
        // In development only, include error message (but never stack traces in response)
        ...(!isProduction && { message: error.message }),
      },
      { status: 500 }
    );
  }

  logger.error("Unknown error", new Error(String(error)), { requestId });

  return NextResponse.json(
    {
      error: "An unknown error occurred",
      requestId,
    },
    { status: 500 }
  );
}

export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    { status: statusCode }
  );
}
