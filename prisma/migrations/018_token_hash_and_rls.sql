-- Migration 018: Auditor token hashing + RLS on remaining tables
-- Apply in Supabase SQL editor or via psql.

-- ── 1. Add token_hash column to auditor_sessions ──────────────────────────────
ALTER TABLE auditor_sessions
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Backfill: hash existing plaintext tokens with pgcrypto SHA-256.
-- encode(..., 'hex') produces a 64-char lowercase hex string matching
-- createHash('sha256').update(token).digest('hex') in Node.js.
UPDATE auditor_sessions
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL;

-- Add unique index on token_hash for fast lookups.
CREATE UNIQUE INDEX IF NOT EXISTS auditor_sessions_token_hash_key
  ON auditor_sessions (token_hash);

-- ── 2. Undo script reference ──────────────────────────────────────────────────
-- To revert: run prisma/migrations/018_token_hash_and_rls.down.sql

-- ── 3. RLS on tables missing from migration 20260318000001 ────────────────────
-- These tables were added after the original RLS migration.
-- The service role (used by Prisma) bypasses RLS; policies protect
-- direct Supabase client / SQL-level access.

ALTER TABLE auditor_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_signoffs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;

-- Policies: allow access only when app.current_org_id session var matches.
-- These are no-ops for service role connections (Prisma).

CREATE POLICY org_isolation_auditor_sessions ON auditor_sessions
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_auditor_comments ON auditor_comments
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_control_signoffs ON control_signoffs
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_exports ON exports
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_api_keys ON api_keys
  USING (org_id = current_setting('app.current_org_id', true));
