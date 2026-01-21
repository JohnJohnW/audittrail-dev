import * as Sentry from "@sentry/nextjs";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private requestId?: string;

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      requestId: this.requestId,
      ...context,
    };

    // Console logging
    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
        ? console.warn
        : level === LogLevel.INFO
        ? console.info
        : console.debug;

    consoleMethod(`[${level.toUpperCase()}] ${message}`, {
      ...context,
      requestId: this.requestId,
    });

    // Sentry logging for errors and warnings
    if (level === LogLevel.ERROR && error) {
      Sentry.captureException(error, {
        extra: context,
        tags: { requestId: this.requestId },
      });
    } else if (level === LogLevel.WARN) {
      Sentry.captureMessage(message, {
        level: "warning",
        extra: context,
        tags: { requestId: this.requestId },
      });
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();
