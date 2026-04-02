-- Undo migration 018: remove token_hash and drop new RLS policies
-- Run this in Supabase SQL editor or via psql to revert migration 018.

-- ── 1. Remove RLS policies added in 018 ─────────────────────────────────────
DROP POLICY IF EXISTS org_isolation_auditor_sessions ON auditor_sessions;
DROP POLICY IF EXISTS org_isolation_auditor_comments ON auditor_comments;
DROP POLICY IF EXISTS org_isolation_control_signoffs ON control_signoffs;
DROP POLICY IF EXISTS org_isolation_exports          ON exports;
DROP POLICY IF EXISTS org_isolation_api_keys         ON api_keys;

ALTER TABLE auditor_sessions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_comments   DISABLE ROW LEVEL SECURITY;
ALTER TABLE control_signoffs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE exports            DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           DISABLE ROW LEVEL SECURITY;

-- ── 2. Remove token_hash column ──────────────────────────────────────────────
DROP INDEX IF EXISTS auditor_sessions_token_hash_key;
ALTER TABLE auditor_sessions DROP COLUMN IF EXISTS token_hash;
