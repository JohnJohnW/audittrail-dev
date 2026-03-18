-- Phase 1: GitHub Signal Expansion
-- Adds webhook infrastructure, org membership events, CI artifacts, deployment environments.
-- Also adds missing columns to repositories and github_connections.

-- ============================================================
-- 1. Add columns to existing tables
-- ============================================================

ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE github_connections
  ADD COLUMN IF NOT EXISTS installation_id INTEGER,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- ============================================================
-- 2. Webhook Events (dedup + audit log for incoming webhooks)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repo_id      TEXT,
  delivery_id  TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  action       TEXT,
  payload      JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_events_org_event_created
  ON webhook_events (org_id, event_type, created_at);

-- ============================================================
-- 3. Org Membership Events (access management evidence)
-- ============================================================

CREATE TABLE IF NOT EXISTS org_membership_events (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  github_login   TEXT NOT NULL,
  github_user_id INTEGER NOT NULL,
  action         TEXT NOT NULL,  -- 'added' | 'removed' | 'role_changed'
  role           TEXT,
  previous_role  TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS org_membership_events_org_occurred
  ON org_membership_events (org_id, occurred_at);

-- ============================================================
-- 4. CI Artifacts (SARIF, SBOM, test reports, coverage)
-- ============================================================

CREATE TABLE IF NOT EXISTS ci_artifacts (
  id            TEXT PRIMARY KEY,
  repo_id       TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  artifact_type TEXT NOT NULL,  -- 'sarif' | 'sbom' | 'test_report' | 'coverage' | 'unknown'
  summary       JSONB,
  raw_url       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, run_id, artifact_type)
);

CREATE INDEX IF NOT EXISTS ci_artifacts_repo_type_created
  ON ci_artifacts (repo_id, artifact_type, created_at);

-- ============================================================
-- 5. Deployment Environments (change management evidence)
-- ============================================================

CREATE TABLE IF NOT EXISTS deployment_environments (
  id                       TEXT PRIMARY KEY,
  repo_id                  TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  org_id                   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  require_reviewers        BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_count           INTEGER NOT NULL DEFAULT 0,
  prevent_self_review      BOOLEAN NOT NULL DEFAULT FALSE,
  required_branches        TEXT[] NOT NULL DEFAULT '{}',
  deployment_branch_policy TEXT,
  synced_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, name)
);

CREATE INDEX IF NOT EXISTS deployment_environments_repo_id
  ON deployment_environments (repo_id);
