/**
 * Secret Redactor
 *
 * Strips secrets, tokens, API keys, and credentials from
 * event payloads before transmitting to AuditTrail.dev.
 */

const REDACTED = "[REDACTED]";

/** Environment variable names that should always be redacted */
const SENSITIVE_ENV_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /auth/i,
  /private/i,
];

/** Patterns matching known API key formats */
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,          // OpenAI
  /ghp_[a-zA-Z0-9]{36,}/g,         // GitHub PAT
  /gho_[a-zA-Z0-9]{36,}/g,         // GitHub OAuth
  /atk_[a-f0-9]{20,}/g,            // AuditTrail
  /xoxb-[a-zA-Z0-9-]+/g,           // Slack bot
  /xoxp-[a-zA-Z0-9-]+/g,           // Slack user
  /AKIA[A-Z0-9]{16}/g,             // AWS access key
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi, // Bearer tokens
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/gi, // PEM keys
];

/** Patterns to redact inline in strings */
const INLINE_SECRET_PATTERNS = [
  /(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"',;}{]+/gi,
  /(?:authorization|x-api-key)\s*[:=]\s*["']?[^\s"',;}{]+/gi,
];

/**
 * Redact secrets from a string value.
 */
export function redactString(value: string): string {
  let result = value;

  // Redact API key patterns
  for (const pattern of API_KEY_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }

  // Redact inline secrets
  for (const pattern of INLINE_SECRET_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const colonIdx = match.indexOf(":");
      const equalsIdx = match.indexOf("=");
      const sepIdx = colonIdx >= 0 ? colonIdx : equalsIdx;
      if (sepIdx >= 0) {
        return match.slice(0, sepIdx + 1) + " " + REDACTED;
      }
      return REDACTED;
    });
  }

  return result;
}

/**
 * Redact secrets from an object recursively.
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if the key name is sensitive
    if (SENSITIVE_ENV_PATTERNS.some((p) => p.test(key))) {
      result[key] = REDACTED;
      continue;
    }

    if (typeof value === "string") {
      result[key] = redactString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "string") return redactString(item);
        if (item && typeof item === "object") return redactObject(item as Record<string, unknown>);
        return item;
      });
    } else if (value && typeof value === "object") {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
