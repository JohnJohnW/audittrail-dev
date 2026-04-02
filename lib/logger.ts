export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  [key: string]: unknown;
}

// Keys whose values are replaced with "[REDACTED]" before logging.
// Checked case-insensitively so "Token", "TOKEN", "token" all match.
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "tokenhash",
  "token_hash",
  "secret",
  "apikey",
  "api_key",
  "keyhash",
  "key_hash",
  "authorization",
  "cookie",
  "sessiontoken",
  "session_token",
  "privatekey",
  "private_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "clientsecret",
  "client_secret",
  "webhooksecret",
  "webhook_secret",
  "stripekey",
  "stripe_key",
]);

function redactSensitive(obj: LogContext): LogContext {
  const result: LogContext = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactSensitive(value as LogContext);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class Logger {
  private requestId?: string;

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const safeContext = context ? redactSensitive(context) : undefined;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      ...safeContext,
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

  error(message: string, error?: unknown, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();
