# Security, Bug & Quality Audit Report

**Date:** 2026-04-01
**Scope:** Application code, browser testing, Vercel deployment, Supabase configuration, GitHub repository
**Methodology:** Code review (automated agent), browser-based testing of live application, deployment dashboard review

---

## Executive Summary

Audit Trail's security posture is **generally solid** with strong fundamentals: proper authentication (NextAuth + GitHub OAuth), encrypted token storage (AES-256-GCM), comprehensive rate limiting (Upstash Redis), HMAC-verified webhooks, and good security headers. The primary concerns are around HTML injection in the contact form, missing Content Security Policy, a potential IDOR pattern in audit cycle updates, and post-export data protection gaps. No critical vulnerabilities were found that would allow unauthorized data access.

| Category                  | Rating         | Summary                                                                      |
| ------------------------- | -------------- | ---------------------------------------------------------------------------- |
| Authentication & Sessions | **Good**       | GitHub OAuth, JWT sessions, encrypted token storage                          |
| Authorization             | **Good**       | Org-scoped queries, subscription checks, rate limiting                       |
| Input Validation          | **Needs Work** | HTML injection in contact form, loose CUID validation                        |
| Cryptography              | **Excellent**  | AES-256-GCM, crypto.randomBytes, timing-safe comparison                      |
| Security Headers          | **Good**       | HSTS, X-Frame-Options, nosniff present; CSP missing                          |
| Webhook Security          | **Excellent**  | HMAC-SHA256 + IP allowlist + dedup for GitHub; Stripe signature verification |
| Rate Limiting             | **Excellent**  | Edge-level sliding window, per-endpoint categories                           |
| Infrastructure            | **Good**       | Vercel firewall active, Supabase healthy, no public storage policies         |
| Error Handling            | **Good**       | Structured errors, no stack traces in production                             |
| Dependencies              | **Good**       | Up to date; next-auth beta should be monitored                               |

---

## Findings by Severity

### HIGH

#### 1. HTML Injection in Contact Form Email

**File:** `app/api/contact/route.ts` (lines 28-59)
**Issue:** User input (name, email, company, message) is interpolated directly into HTML email templates without escaping. An attacker can inject HTML/CSS that could be used for phishing if the email is forwarded.

```typescript
// Current (vulnerable):
<td>${name}</td>
<p>${message}</p>

// Should be:
<td>${escapeHtml(name)}</td>
<p>${escapeHtml(message)}</p>
```

**Impact:** Email content injection, potential phishing via forwarded admin emails.
**Remediation:** Add HTML entity escaping for all user input before template interpolation. Create a shared `escapeHtml()` utility.

#### 2. Missing Content Security Policy (CSP)

**File:** `next.config.js` / `middleware.ts`
**Issue:** No Content-Security-Policy header is set. The existing security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are all present and correctly configured, but CSP is absent.

**Impact:** Increased XSS risk if any injection vector is found. CSP is a defense-in-depth layer.
**Remediation:** Add a CSP header. Start with report-only mode to identify violations before enforcing:

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.posthog.com https://*.sentry.io;
```

#### 3. GitHub Access Token Stored in JWT

**File:** `lib/auth.ts` (line 60)
**Issue:** The GitHub OAuth access token is stored in the JWT payload alongside orgId and orgRole. JWTs are base64-encoded (not encrypted) and visible to the client. The token is also correctly stored encrypted in the database (line 80), making the JWT copy redundant.

**Impact:** If the JWT is intercepted or leaked (browser storage, logs), the GitHub access token is exposed.
**Remediation:** Remove `token.githubAccessToken = account.access_token` from the JWT callback. Fetch the encrypted token from the database via `getGitHubClientForOrg()` when needed.

---

### MEDIUM

#### 4. Potential IDOR in Audit Cycle Updates

**File:** `app/api/audit-cycles/[id]/route.ts`
**Issue:** The PATCH endpoint verifies the cycle belongs to the org via `findFirst({ where: { id, orgId } })`, but then updates using only `update({ where: { id } })`. While the initial check prevents unauthorized access, a race condition between check and update is theoretically possible.

**Remediation:** Use `update({ where: { id, orgId } })` to include the org scope in the update query itself.

#### 5. Loose CUID Validation

**File:** `lib/utils/validation.ts` (line 15)
**Issue:** The CUID validation regex `^c[a-z0-9]{20,}$/i` is case-insensitive and accepts any length >= 21 characters. Standard CUIDs are exactly 25 characters, lowercase only.

**Remediation:** Tighten to `^c[a-z0-9]{24}$` (no `i` flag, exact length).

#### 6. Race Condition in API Key Creation

**File:** `app/api/keys/route.ts` (lines 56-62)
**Issue:** The key count check and creation are not in a transaction. Concurrent requests could exceed the 10-key-per-org limit.

**Remediation:** Wrap the count check and creation in a `db.$transaction()`.

#### 7. No Database Backups Configured

**Observed in:** Supabase dashboard (AuditTrail.dev-prod project)
**Issue:** "No backups" shown in project overview. On Supabase Free/Nano plan, automatic backups are not included.

**Impact:** Data loss risk if the database is corrupted or accidentally modified.
**Remediation:** Upgrade Supabase plan for automatic backups, or implement manual backup strategy via `pg_dump` cron job.

#### 8. Weak Email Validation in Contact Form

**File:** `app/api/contact/route.ts` (line 16)
**Issue:** The email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` is too permissive. The codebase already has a proper `isValidEmail()` utility elsewhere.

**Remediation:** Use the existing `isValidEmail()` from `lib/utils/validation.ts`.

---

### LOW

#### 9. Session Duration of 30 Days

**File:** `lib/auth.ts` (line 176)
**Issue:** JWT max age is 30 days. Industry standard for compliance/security tools is typically 7-14 days.

**Remediation:** Reduce to 14 days. Consider implementing refresh token rotation.

#### 10. Log Injection Risk in GitHub App Callback

**File:** `app/api/github/app-callback/route.ts` (line 22)
**Issue:** Raw user-controlled `installation_id` parameter is logged in warning messages. An attacker could inject log entries via crafted URLs.

**Remediation:** Log "invalid installation_id format" without the raw value, or sanitize before logging.

#### 11. Error Handler Uses Math.random() Fallback

**File:** `lib/error-handler.ts` (line 40)
**Issue:** If `crypto.randomUUID()` fails, the fallback uses `Math.random()` for request ID generation. While not cryptographic, request IDs should be unpredictable.

**Remediation:** Use a hash-based fallback instead of `Math.random()`.

#### 12. Missing Input Length Validation on Evidence Feedback

**File:** `app/api/evidence/[controlCode]/flag/route.ts`
**Issue:** The `reason` and `note` fields have no maximum length validation.

**Remediation:** Add `reason.length > 5000` and `note.length > 10000` checks.

#### 13. `MAX_CONCURRENT` Export Limit Defined but Not Enforced

**File:** `lib/constants.ts` (line 117)
**Issue:** `EXPORT_CONFIG.MAX_CONCURRENT = 3` is defined but no concurrency control is implemented in export endpoints.

**Remediation:** Implement or remove the unused constant.

---

### INFORMATIONAL

#### 14. Supabase Storage: No RLS Policies

**Observed in:** Supabase dashboard > Storage > Policies
**Status:** The `evidence-uploads` bucket has 0 policies. This is acceptable because all storage access goes through the service role key (server-side only). No client-side Supabase auth is used for storage.

**Note:** If client-side direct uploads are ever added, RLS policies will be essential.

#### 15. Supabase on Free/Nano Plan

**Observed in:** Supabase dashboard
**Status:** Project runs on `t4g.nano` in ap-southeast-2 (Sydney). This is appropriate for the current scale but may need upgrading as data grows.

#### 16. Vercel Has 3 Deployment Recommendations

**Observed in:** Vercel dashboard > Deployment Settings
**Status:** Vercel shows "3 Recommendations" for deployment settings. These should be reviewed and addressed.

---

## Browser Testing Results

### Pages Tested

| Page           | Status  | Load Time | Issues                                                 |
| -------------- | ------- | --------- | ------------------------------------------------------ |
| `/` (landing)  | OK      | Fast      | No console errors                                      |
| `/dashboard`   | OK      | ~3s       | Loads correctly, shows 38% compliance score            |
| `/evidence`    | OK      | ~5s       | 97 controls displayed, filters work                    |
| `/compliance`  | OK      | ~5s       | Score chart renders, framework breakdown visible       |
| `/settings`    | OK      | ~5s       | Org info, subscription status, plan features displayed |
| `/pricing`     | **404** | N/A       | Pricing page returns 404                               |
| `/auth/signin` | OK      | Redirect  | Auto-redirects to dashboard when authenticated         |

### Bugs Found

#### Bug 1: `/pricing` Returns 404

**Severity:** Medium (UX)
**Issue:** The nav link "Pricing" in the header appears to link to `/pricing`, but no such page exists. The pricing section is rendered as part of the landing page (anchor link or component).

**Impact:** Users clicking "Pricing" in the nav or bookmarking a pricing URL get a 404.
**Remediation:** Either create a dedicated `/pricing` page or update the nav link to use an anchor (`/#pricing`).

#### Bug 2: Slow Initial Page Loads

**Severity:** Low (Performance)
**Issue:** Dashboard pages take 3-5 seconds to render content after navigation. The page shell (header, sidebar) appears immediately but the content area is blank for several seconds.

**Impact:** Perceived slowness. Users may think the page is broken.
**Remediation:** Add loading skeletons/spinners for data-fetching states. Consider prefetching common API routes.

### Security Headers (Verified via Browser)

| Header                      | Present | Value                                                        |
| --------------------------- | ------- | ------------------------------------------------------------ |
| Strict-Transport-Security   | Yes     | max-age=63072000; includeSubDomains; preload                 |
| X-Frame-Options             | Yes     | DENY                                                         |
| X-Content-Type-Options      | Yes     | nosniff                                                      |
| Referrer-Policy             | Yes     | strict-origin-when-cross-origin                              |
| Permissions-Policy          | Yes     | camera=(), microphone=(), geolocation=(), interest-cohort=() |
| Content-Security-Policy     | **No**  | Missing                                                      |
| X-DNS-Prefetch-Control      | Yes     | on                                                           |
| Access-Control-Allow-Origin | Yes     | \* (broad, but acceptable for a public-facing site)          |

### API Security Tests

| Test                             | Result | Detail                                         |
| -------------------------------- | ------ | ---------------------------------------------- |
| Health check POST                | 405    | Correctly rejects wrong method                 |
| Nonexistent endpoint             | 404    | Clean 404, no stack trace                      |
| Compliance score (authenticated) | 200    | Returns data correctly                         |
| API method enforcement           | Pass   | Endpoints correctly reject unsupported methods |

---

## Infrastructure Review

### Vercel Deployment

| Check             | Status     | Detail                                                  |
| ----------------- | ---------- | ------------------------------------------------------- |
| Deployment status | Healthy    | Ready, deployed Mar 22                                  |
| Domains           | Configured | www.audit-trail.net + audittrail-dev.vercel.app         |
| Firewall          | Active     | All systems normal, no recent events                    |
| Logs              | Clean      | All recent requests returning 200; no unexpected errors |
| Cron job          | Configured | `/api/cron/sync` daily at 02:00 UTC                     |
| Build             | Passing    | Latest commit c851d2c deployed successfully             |

### Supabase

| Check            | Status     | Detail                                                 |
| ---------------- | ---------- | ------------------------------------------------------ |
| Project status   | Healthy    | Active on ap-southeast-2                               |
| Storage bucket   | Configured | evidence-uploads, 50MB limit, MIME type restrictions   |
| Storage policies | None (OK)  | Service role access only, no public policies           |
| Backups          | **None**   | No automatic backups configured (Nano plan limitation) |
| Database         | PostgreSQL | pgbouncer session mode, connection pooling active      |

### GitHub Repository

| Check             | Status      | Detail                                                 |
| ----------------- | ----------- | ------------------------------------------------------ |
| .env files in git | Clean       | `.env.local` and `.env` in .gitignore; never committed |
| Branch protection | Not checked | Should verify main branch protection rules             |
| Secrets in code   | Clean       | No hardcoded API keys or secrets found in source code  |
| Dependencies      | Current     | No known vulnerable packages detected                  |

---

## Positive Security Findings

These areas are well-implemented and should be maintained:

1. **Token encryption** (`lib/encryption.ts`): AES-256-GCM with random IV, 128-bit auth tag, proper format
2. **API key hashing** (`lib/api/api-key-auth.ts`): SHA-256 hash storage, key prefix for identification, expiry + revocation
3. **GitHub webhook security** (`app/api/webhooks/github/route.ts`): HMAC-SHA256 + timing-safe comparison + IP allowlist + delivery dedup
4. **Stripe webhook security** (`app/api/webhooks/stripe/route.ts`): `constructEvent()` signature verification
5. **Rate limiting** (`middleware.ts`): Edge-level Upstash Redis sliding window with per-category limits
6. **File upload validation** (`app/api/evidence/upload/route.ts`): MIME type whitelist, size limits per type, edge-level payload gate
7. **CSV injection prevention** (`app/api/exports/route.tsx`): Formula character escaping (=, +, -, @, tab, CR)
8. **Database connection handling** (`lib/db.ts`): Singleton pattern, retry with exponential backoff, error isolation
9. **Security headers**: Comprehensive set (HSTS 2yr, DENY framing, nosniff, strict referrer, restrictive permissions)
10. **Cryptographic randomness**: Consistent use of `crypto.randomBytes()` and `crypto.getRandomValues()` throughout

---

## Priority Action Items

### Immediate (This Sprint)

1. Fix HTML injection in contact form email templates
2. Remove GitHub access token from JWT payload
3. Add Content-Security-Policy header (start with report-only)

### Soon (Next Sprint)

4. Fix IDOR pattern in audit cycle updates (add orgId to update where clause)
5. Tighten CUID validation regex
6. Wrap API key creation in database transaction
7. Fix `/pricing` 404 bug
8. Add loading skeletons for slow-loading pages

### Planned (Next Quarter)

9. Configure Supabase database backups
10. Reduce session duration to 14 days
11. Add input length validation across all API routes
12. Review and address Vercel's 3 deployment recommendations
13. Implement export concurrency control or remove unused constant
