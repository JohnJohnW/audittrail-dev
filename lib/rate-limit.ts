import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Only create Redis client if both URL and TOKEN are configured
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Warn if partially configured (common misconfiguration)
if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
  logger.warn(
    "UPSTASH_REDIS_REST_URL is set but UPSTASH_REDIS_REST_TOKEN is missing — rate limiting disabled"
  );
}

// Rate limiters for different endpoints
export const rateLimiters = {
  // General API: 100 requests per 10 minutes
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "10 m"),
        analytics: true,
      })
    : null,

  // Auth endpoints: 10 requests per minute
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
      })
    : null,

  // Sync endpoints: 5 requests per minute
  sync: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
      })
    : null,

  // Export endpoints: 10 requests per hour
  export: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
      })
    : null,
};

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = rateLimiters[type];

  if (!limiter) {
    // If Redis is not configured, allow all requests (for development)
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
