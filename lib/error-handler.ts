import { NextResponse } from "next/server";
import { logger } from "./logger";

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: any;
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
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
  // Generate request ID for tracking
  const requestId = crypto.randomUUID();

  if (error instanceof AppError) {
    logger.error(
      `API Error [${error.statusCode}]: ${error.message}`,
      error,
      { requestId, code: error.code, details: error.details }
    );

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        requestId,
        ...(process.env.NODE_ENV === "development" && { details: error.details }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`, error, { requestId });

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        requestId,
        ...(process.env.NODE_ENV === "development" && {
          message: error.message,
          stack: error.stack,
        }),
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
