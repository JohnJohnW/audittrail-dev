/**
 * Next.js Edge Middleware. API Gateway layer
 *
 * Runs at the Vercel Edge Network before any serverless function:
 *   1. CORS                . origin whitelist + OPTIONS preflight for /api/* routes
 *   2. Request ID          . generates X-Request-Id on every response for tracing
 *   3. Upload size gate    . rejects oversized bodies on /api/evidence/upload before compute
 *   4. API rate limiting   . sliding-window per user (session cookie) or IP (Upstash Redis)
 *   5. Dashboard auth      . redirects unauthenticated users to sign-in
 *
 * GitHub IP allowlisting for /api/webhooks/github is handled inside the route
 * itself (needs the raw body for HMAC). see app/api/webhooks/github/route.ts.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash Redis (edge-compatible) ──────────────────────────────────────────
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── Rate limiters (mirrors lib/rate-limit.ts tiers) ──────────────────────────
const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "10 m"),
      prefix: "rl:mw:api",
      analytics: true,
    })
  : null;

const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:mw:auth",
      analytics: true,
    })
  : null;

// ── Constants ─────────────────────────────────────────────────────────────────
// Max body size for evidence uploads. reject at the edge before compute.
// Individual file-type limits are enforced again inside the route handler.
const UPLOAD_MAX_BYTES = 55 * 1024 * 1024; // 55 MB (edge gate; route enforces 50 MB per file)

// Routes that skip the general API rate limiter (they have their own controls)
const RATE_LIMIT_SKIP_PREFIXES = [
  "/api/cron/", // secret-gated internal cron; scheduler has its own backoff
  "/api/health", // monitoring probes. must never be blocked
  "/api/auth/", // NextAuth handles its own throttling internally
  "/api/webhooks/stripe", // Stripe IPs + HMAC signature verified inside route
  "/api/webhooks/github", // GitHub IPs + HMAC signature verified inside route
];

// Allowed CORS origins. Requests from other origins are served without
// Access-Control-Allow-Origin so browser cross-origin reads are blocked.
const ALLOWED_ORIGINS: string[] = [
  "https://audit-trail.net",
  "https://www.audit-trail.net",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function shouldSkipRateLimit(pathname: string): boolean {
  return RATE_LIMIT_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Hash the session cookie to use as a per-user rate limit key.
 * Uses Web Crypto (available in edge runtime). Falls back to IP.
 */
async function getRateLimitKey(request: NextRequest): Promise<string> {
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (sessionToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `u:${hex.slice(0, 24)}`; // short prefix avoids Redis key bloat
  }

  return `ip:${getClientIP(request)}`;
}

/**
 * Build CORS headers for a given Origin value.
 * Returns an empty object if the origin is not in the allow-list.
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {};
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Generate a unique request ID for tracing across logs / Sentry breadcrumbs.
  const requestId = crypto.randomUUID();

  // Helper: stamp standard headers onto any outgoing response.
  function withStandardHeaders(res: NextResponse): NextResponse {
    res.headers.set("X-Request-Id", requestId);
    const cors = getCorsHeaders(origin);
    for (const [k, v] of Object.entries(cors)) {
      res.headers.set(k, v);
    }
    return res;
  }

  // 0. CORS preflight ── answer OPTIONS early so the browser doesn't stall.
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const cors = getCorsHeaders(origin);
    return new NextResponse(null, {
      status: 204,
      headers: { ...cors, "X-Request-Id": requestId },
    });
  }

  // 1. Upload size gate ── checked via Content-Length header before the body
  //    is buffered, so oversized requests are rejected before hitting compute.
  if (pathname === "/api/evidence/upload") {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > UPLOAD_MAX_BYTES) {
      return withStandardHeaders(
        new NextResponse("Payload Too Large", {
          status: 413,
          headers: { "Content-Type": "text/plain" },
        })
      );
    }
  }

  // 2. API rate limiting (all /api/* except explicitly skipped routes)
  if (pathname.startsWith("/api/") && !shouldSkipRateLimit(pathname)) {
    const limiter = pathname.startsWith("/api/auth/") ? authLimiter : apiLimiter;

    if (limiter) {
      const key = await getRateLimitKey(request);
      const { success, limit, remaining, reset } = await limiter.limit(key);

      if (!success) {
        return withStandardHeaders(
          new NextResponse("Too Many Requests", {
            status: 429,
            headers: {
              "Content-Type": "text/plain",
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(reset),
              "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
            },
          })
        );
      }

      // Forward quota headers + standard headers to the route.
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(limit));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      return withStandardHeaders(response);
    }
  }

  // 3. Dashboard auth ── cookie presence check (full JWT validation happens
  //    inside each route/page via requireAuth(); this is a fast redirect guard).
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isAuthPage = pathname.startsWith("/auth");

  const isDashboardPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/repositories") ||
    pathname.startsWith("/evidence") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/exports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/grc") ||
    pathname.startsWith("/ciso") ||
    pathname.startsWith("/risk-register") ||
    pathname.startsWith("/audits");

  if (isLoggedIn && isAuthPage) {
    return withStandardHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (!isLoggedIn && isDashboardPage) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return withStandardHeaders(NextResponse.redirect(signInUrl));
  }

  return withStandardHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // All API routes (rate limiting + upload size gate)
    "/api/:path*",
    // Dashboard pages (auth redirect). includes new pages added since original middleware
    "/dashboard/:path*",
    "/repositories/:path*",
    "/evidence/:path*",
    "/compliance/:path*",
    "/exports/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/grc/:path*",
    "/ciso/:path*",
    "/risk-register/:path*",
    "/audits/:path*",
    "/auth/:path*",
  ],
};
