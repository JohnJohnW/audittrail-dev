export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private requestId?: string;

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      ...context,
    };

    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
          ? console.warn
          : level === LogLevel.INFO
            ? console.info
            : console.debug;

    if (error) {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, logEntry, error);
    } else {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, logEntry);
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
