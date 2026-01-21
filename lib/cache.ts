import { Redis } from "@upstash/redis";

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
  console.warn(
    "UPSTASH_REDIS_REST_URL is set but UPSTASH_REDIS_REST_TOKEN is missing - caching disabled"
  );
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  if (!redis) {
    // No cache available, return fresh data
    return fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }

  // Cache miss, fetch and store
  const data = await fetcher();
  try {
    await redis.setex(key, ttl, data);
  } catch (error) {
    console.error("Cache write error:", error);
  }

  return data;
}

export async function invalidateCache(pattern: string) {
  if (!redis) return;

  try {
    // Note: Upstash Redis doesn't support KEYS command in serverless
    // In production, maintain a set of cache keys or use a different invalidation strategy
    // For now, we'll use a simple key-based approach
    await redis.del(pattern);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export function getCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(":")}`;
}
