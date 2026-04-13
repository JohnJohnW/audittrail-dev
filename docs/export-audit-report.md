# Export Functionality Audit Report

**Date:** 2026-04-01
**Scope:** All export functionality in Audit Trail
**Methodology:** Code review of all export-related API routes, libraries, components, and database models.

---

## Executive Summary

Audit Trail has three export pathways: PDF/CSV report exports, full org data exports (JSON ZIP), and auditor portal exports (ZIP). Access control and audit logging are generally well-implemented. The primary risks are in post-export data protection (no watermarking or revocation) and performance under scale (synchronous generation with no async fallback).

| Area                      | Risk Rating | Summary                                                     |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| Access Control            | **Low**     | Authentication + Pro subscription + rate limiting enforced  |
| Data Scope                | **Medium**  | Full export includes all org data; no field-level exclusion |
| Data Freshness            | **Medium**  | Live queries but no staleness indicator                     |
| Performance & Reliability | **Medium**  | Synchronous generation, no timeout handling                 |
| Audit Logging             | **Low**     | Export records logged; auditor exports are the gap          |
| Post-Export Risk          | **High**    | No watermarking, no file expiry, no revocation              |

---

## 1. Access Control - Low Risk

### Current State

**PDF/CSV Exports (`/api/exports` - `app/api/exports/route.tsx`)**

- Authentication: `requireAuth()` enforces valid session + org membership
- Subscription: `canExport(orgId)` checks `subscription.plan === "pro"` and active status
- Rate limiting: `checkRateLimit(orgId, "export")` - 10 exports per hour per org
- Error: Returns 403 `SUBSCRIPTION_REQUIRED` for free users, 429 `RATE_LIMITED` for excess

**Full Org Export (`/api/org/export` - `app/api/org/export/route.ts`)**

- Authentication: `requireAuth()` enforces valid session + org membership
- Subscription: `hasProSubscription(orgId)` check
- Error: Returns 403 `PRO_REQUIRED` for free users

**Auditor Portal Export (`/api/auditor/[token]/export` - `app/api/auditor/[token]/export/route.ts`)**

- Authentication: Token-based (32-byte random hex, not OAuth)
- Validation: Token existence check + expiry timestamp check (`session.expiresAt < new Date()`)
- No subscription check (auditor access is independent of billing)
- Framework filtering: Respects `frameworkFilter` from auditor session

### Findings

| Finding                                  | Severity | Detail                                                                                                                        |
| ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| No role-based restriction on exports     | Low      | Any org member (member, admin, owner) can trigger exports. Full org data export should arguably be restricted to admin/owner. |
| Auditor token is the sole access control | Low      | Token is 32 bytes of randomness (256 bits of entropy) -- sufficient for unguessable URLs. Expiry is enforced.                 |
| Rate limiting is per-org, not per-user   | Info     | A single org member could consume all 10 export slots per hour, blocking other members.                                       |
| No IP restriction on auditor exports     | Info     | Auditor exports are accessible from any IP with a valid token. Consider IP allowlisting for sensitive audits.                 |

### Recommendations

1. Restrict full org data export (`/api/org/export`) to admin and owner roles via `orgRole` check in `requireAuth()` context.
2. Consider per-user rate limiting in addition to per-org.
3. Add optional IP allowlisting for auditor sessions (store allowed IPs in `AuditorSession` model).

---

## 2. Data Scope - Medium Risk

### Current State

**PDF/CSV Export** includes:

- Control code, title, framework, status
- Evidence count, type, title, description, timestamp, URL, relevance
- Repository name
- Optional filters: framework, date range, repository IDs

**Full Org Export** includes:

- Compliance evidence (frameworks, controls, all evidence items with full descriptions)
- Historical compliance snapshots (all time)
- Risk treatments (all records with owner/creator names and emails)
- Gap assignments (all records with assignee/assigner names and emails)
- Audit cycles (all cycles + findings + auditor requests)
- Control notes (all notes with author information)
- Last 500 compliance alerts

**Auditor Export** includes:

- README with org name, framework, auditor info
- Summary CSV (all controls + auditor verdicts + sign-off dates)
- Evidence CSV (all evidence items for filtered frameworks)

### Findings

| Finding                                | Severity | Detail                                                                                                                                                |
| -------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full export includes PII               | Medium   | Risk treatments and gap assignments include user names and email addresses (owner, creator, assignee). This data leaves the system in plaintext JSON. |
| No field-level exclusion               | Medium   | Full export is all-or-nothing. Users cannot exclude specific sections (e.g., export compliance data without risk treatments).                         |
| Internal notes are exported            | Low      | Control notes (which may contain internal commentary) are included in the full export. These could be shared inadvertently.                           |
| Alert data exported in bulk            | Low      | Last 500 alerts exported without filtering. Alerts may contain sensitive context about security incidents.                                            |
| Auditor export is appropriately scoped | Positive | Framework filter restricts auditor visibility. Sign-off data is included for audit completeness.                                                      |
| No data classification system          | Medium   | No distinction between internal-only fields and shareable fields. The system treats all data as equally exportable.                                   |

### Recommendations

1. Add section selection to full org export (allow users to choose which sections to include).
2. Implement data classification: mark fields as `internal`, `confidential`, or `shareable`. Default full export to `shareable` fields only, with explicit opt-in for sensitive data.
3. Redact or anonymize user emails in exports by default (show name only, require explicit "include emails" toggle).
4. Add an export preview that shows users exactly what data will be included before generation.
5. Consider separate export permission for risk treatment data (may contain sensitive incident details).

---

## 3. Data Freshness - Medium Risk

### Current State

- **PDF/CSV exports:** Query the live database at time of request. No caching layer.
- **Full org export:** Queries live database. `manifest.json` includes `exportedAt` timestamp.
- **Auditor export:** Queries live database. README includes export date.
- **Cron sync:** Runs daily at 02:00 UTC. Between syncs, GitHub data may be up to 24 hours stale.
- **Compliance snapshots:** Captured daily during cron sync. Used for trends but not directly in exports.

### Findings

| Finding                                        | Severity | Detail                                                                                                                                          |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| No per-repository `lastSyncedAt` in exports    | Medium   | Users cannot determine how fresh the evidence is for each repository. A repo last synced 23 hours ago may have outdated evidence.               |
| PDF generation date != data vintage            | Medium   | PDF shows "Generated: 2026-04-01" but doesn't indicate when the underlying evidence was last collected from GitHub.                             |
| No staleness warning                           | Medium   | If a user exports data and the last sync failed (e.g., GitHub API rate limit), the export may contain significantly stale data with no warning. |
| Full export has `exportedAt` but no `dataAsOf` | Low      | The manifest shows when the export was created but not the freshness of the underlying data.                                                    |
| Snapshots are correctly timestamped            | Positive | Historical snapshots include `snapshotDate`, which accurately represents when the data was captured.                                            |

### Recommendations

1. Include `lastSyncedAt` per repository in all exports (add a "Data Freshness" section to PDFs, a metadata row in CSVs, and a field in the full export manifest).
2. Show a warning banner in the export UI when any repository hasn't synced in >24 hours.
3. Add `dataAsOf` to export manifest: the oldest `lastSyncedAt` across all included repositories.
4. Consider allowing users to trigger a sync before export (already possible via "Sync Now" button, but not integrated into the export flow).

---

## 4. Performance & Reliability - Medium Risk

### Current State

- **PDF/CSV exports:** Synchronous. Request triggers evidence query, PDF/CSV generation, and response in a single HTTP request.
- **Full org export:** Synchronous. Queries 7+ database tables, builds JSON, creates ZIP, uploads to Supabase storage, creates signed URL, responds.
- **Auditor export:** Synchronous. Queries evidence + sign-offs, builds ZIP, streams response.
- **Export record status:** `pending` → `completed` or `failed`. Created before generation, updated after.
- **Vercel serverless timeout:** 60 seconds default (can be extended to 300s on Pro plan).
- **Rate limiting:** 10 exports/hour prevents abuse but doesn't prevent timeout.

### Findings

| Finding                                      | Severity | Detail                                                                                                                                                         |
| -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No async/background processing               | Medium   | All exports block the HTTP request. For large orgs with many repos, the full export could exceed Vercel's timeout.                                             |
| No progress indicator                        | Medium   | Users see a loading spinner but no progress percentage or status updates during generation.                                                                    |
| PDF generation may be slow                   | Medium   | `@react-pdf/renderer`'s `renderToBuffer` processes all controls sequentially. For 80+ controls with hundreds of evidence items, this could take 10-30 seconds. |
| No retry logic                               | Low      | Failed exports are logged but not retried. Users must manually retry.                                                                                          |
| Supabase upload is a single point of failure | Low      | Full export uploads the ZIP to Supabase storage. If Supabase is unavailable, the export fails after all the data collection work is done.                      |
| Error handling catches generation failures   | Positive | Export status is correctly updated to `failed` on error (`app/api/exports/route.tsx:264-270`).                                                                 |
| `MAX_CONCURRENT: 3` defined but not enforced | Info     | `EXPORT_CONFIG.MAX_CONCURRENT` is set to 3 in constants but no concurrency control is implemented.                                                             |

### Recommendations

1. **Short-term:** Add timeout detection. If generation approaches 50 seconds, return a 202 Accepted with a status URL and continue processing in the background.
2. **Medium-term:** Move full org export to async processing. Use Vercel background functions or a queue system. Return immediately with a job ID, poll for completion.
3. Add progress tracking: update the export record with intermediate status (e.g., "Collecting compliance data", "Generating PDF", "Uploading").
4. Add client-side polling: when an export is in `pending` status, poll every 3 seconds for completion.
5. Implement the `MAX_CONCURRENT` limit: check for in-progress exports before starting a new one.
6. Add Supabase upload retry (exponential backoff, 3 attempts) for the full export ZIP upload.

---

## 5. Audit Logging - Low Risk

### Current State

**PDF/CSV Exports:**

- Export record created in database before generation: `orgId`, `userId`, `type` (pdf/csv), `frameworkId`, `fileName`, `status`, `createdAt`, `updatedAt`
- Status tracked: `pending` → `completed` or `failed`
- GET endpoint returns paginated export history (most recent first, max 20 per page)

**Full Org Export:**

- No explicit export record created (the function returns a download URL but doesn't log to the Export table)

**Auditor Export:**

- No export record created (token-based access, no logging to Export table)

**Admin Visibility:**

- Export history visible to the user who created exports
- No admin-facing view of all org exports across members
- No export audit log page

### Findings

| Finding                                    | Severity | Detail                                                                                                                                                      |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full org export not logged in Export table | Medium   | The most comprehensive export (all org data as ZIP) doesn't create an audit trail record. Only the signed URL generation is logged in Supabase access logs. |
| Auditor exports not logged                 | Medium   | When an auditor downloads evidence, no record is created. The org has no visibility into when or how often auditors export data.                            |
| No admin export audit view                 | Low      | Org admins cannot see a consolidated view of all exports by all members. Each user only sees their own export history.                                      |
| Export format not captured for full export | Low      | The full export always produces a ZIP, but the Export table's `type` field only captures "pdf" or "csv" from the report export endpoint.                    |
| No IP address logging                      | Info     | Export records don't capture the requester's IP address. This could be useful for security investigations.                                                  |

### Recommendations

1. **Create export records for full org exports.** Add an Export table entry with `type: "full_export"` in `/api/org/export`.
2. **Log auditor exports.** Create an Export table entry (or a dedicated `AuditorExportLog` table) when auditor exports are downloaded. Include: `sessionId`, `auditorEmail`, `frameworkFilter`, `timestamp`.
3. **Add admin export audit page.** Create a settings sub-page showing all exports across the org: who exported, when, what type, which framework, file name.
4. **Add IP address to export records.** Capture `request.headers.get("x-forwarded-for")` for security audit purposes.

---

## 6. Post-Export Risk - High Risk

### Current State

- **PDF exports:** Returned as direct binary response (`Content-Disposition: attachment`). No server-side storage. Once downloaded, the file is uncontrolled.
- **CSV exports:** Same as PDF -- direct download, no server-side storage.
- **Full org export ZIP:** Uploaded to Supabase storage with a signed URL valid for 1 hour. After the URL expires, the file remains in storage but is inaccessible without a new signed URL.
- **Auditor export ZIP:** Returned as direct binary response. No server-side storage.
- **No watermarking** on any export format.
- **No DRM or access controls** on downloaded files.
- **No expiry mechanism** for downloaded files (only the signed URL for full exports has a TTL).
- **No revocation capability** once a file is downloaded.

### Findings

| Finding                                    | Severity | Detail                                                                                                                                                                                                        |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No watermarking on PDFs                    | High     | Downloaded PDFs contain no identifying information about who exported them or when. A leaked PDF cannot be traced to its source.                                                                              |
| No watermarking on CSVs                    | Medium   | CSV files are raw data with no provenance metadata. They can be copied and shared without attribution.                                                                                                        |
| Full export ZIPs are persistent in storage | Medium   | ZIP files uploaded to Supabase storage remain indefinitely. Old exports accumulate. There's no cleanup job.                                                                                                   |
| No file-level access revocation            | High     | Once a PDF/CSV is downloaded, there's no way to invalidate or recall it. If an employee leaves or access is revoked, their downloaded files remain accessible to them.                                        |
| No data handling notice in exports         | Medium   | Exports don't include terms of use, confidentiality notices, or data handling expectations.                                                                                                                   |
| Auditor export ZIP is unprotected          | Medium   | The auditor export ZIP is not password-protected. If the auditor's email is compromised, the export can be accessed by forwarding the download link (though the link is a direct response, not a stored URL). |
| Signed URL for full export is time-limited | Positive | The 1-hour TTL on full export download URLs limits the window for unauthorized access via shared links.                                                                                                       |

### Recommendations

1. **Add visible watermark to PDF exports.** Include: exporter name, export timestamp, org name, and a unique export ID on every page footer. Use `@react-pdf/renderer`'s fixed footer component.
2. **Add metadata header to CSV exports.** First 3 rows should be: export ID, exporter, timestamp (prefixed with `#` to be treated as comments by CSV parsers).
3. **Add confidentiality notice to all exports.** Include "CONFIDENTIAL -- [Org Name] -- Exported by [User] on [Date]" in PDF headers and CSV metadata.
4. **Implement storage cleanup for full exports.** Add a cron job or TTL policy to delete export ZIPs from Supabase storage after 30 days.
5. **Add password protection for auditor export ZIPs.** Generate a random password, display it to the user who created the auditor session (not sent via email with the link).
6. **Add export revocation capability.** Track all active export IDs. When access is revoked (user removal, auditor session expiry), mark exports as revoked. For signed-URL exports, delete the storage object. For direct downloads, this is a terms-of-use issue rather than a technical control.
7. **Add Data Handling section to Terms of Service.** Define expectations for how exported data should be stored, shared, and destroyed.
8. **Consider DLP integration.** For enterprise customers, provide hooks to integrate with Data Loss Prevention tools that can track or restrict export distribution.

---

## Appendix: Export Endpoint Reference

| Endpoint                      | Method | Auth            | Format         | Pro-Gated      | Logged             | File                                      |
| ----------------------------- | ------ | --------------- | -------------- | -------------- | ------------------ | ----------------------------------------- |
| `/api/exports`                | POST   | OAuth + session | PDF/CSV        | Yes            | Yes (Export table) | `app/api/exports/route.tsx`               |
| `/api/exports`                | GET    | OAuth + session | JSON (list)    | No (read-only) | N/A                | `app/api/exports/route.tsx`               |
| `/api/org/export`             | POST   | OAuth + session | ZIP (Supabase) | Yes            | **No**             | `app/api/org/export/route.ts`             |
| `/api/auditor/[token]/export` | GET    | Token           | ZIP (stream)   | No             | **No**             | `app/api/auditor/[token]/export/route.ts` |

## Appendix: Rate Limiting

| Endpoint                      | Limit           | Window | Key                                 |
| ----------------------------- | --------------- | ------ | ----------------------------------- |
| `/api/exports`                | 10              | 1 hour | orgId                               |
| `/api/org/export`             | (none specific) | N/A    | (uses general API limit: 100/10min) |
| `/api/auditor/[token]/export` | (none specific) | N/A    | (uses general API limit: 100/10min) |

**Note:** The full org export and auditor export endpoints lack dedicated rate limiting. The general API rate limit (100 requests per 10 minutes) applies but is very permissive for export operations.
