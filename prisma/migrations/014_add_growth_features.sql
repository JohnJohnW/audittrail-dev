-- Migration: 014_add_growth_features
-- Adds: ComplianceAlert, ControlNote, EvidenceException, AuditorSession,
--       AuditorComment, ControlSignoff, OrgProfile, IndustryBenchmark

-- ============================================
-- COMPLIANCE MONITORING & ALERTS
-- ============================================

CREATE TABLE compliance_alerts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'medium',
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata    JSONB,
  resolved_at TIMESTAMPTZ,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX compliance_alerts_org_resolved_created
  ON compliance_alerts (org_id, resolved_at, created_at DESC);

-- ============================================
-- LOCK-IN FEATURES
-- ============================================

CREATE TABLE control_notes (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code   TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  content        TEXT NOT NULL,
  author_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, control_code, framework_name)
);

CREATE TABLE evidence_exceptions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code   TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  reason         TEXT NOT NULL,
  expires_at     TIMESTAMPTZ,
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, control_code, framework_name)
);

-- ============================================
-- AUDITOR PORTAL
-- ============================================

CREATE TABLE auditor_sessions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auditor_email    TEXT NOT NULL,
  auditor_name     TEXT,
  token            TEXT NOT NULL UNIQUE,
  framework_filter TEXT,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ
);

CREATE INDEX auditor_sessions_org_id ON auditor_sessions (org_id);

CREATE TABLE auditor_comments (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id     TEXT NOT NULL REFERENCES auditor_sessions(id) ON DELETE CASCADE,
  control_code   TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  body           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  resolved_by    TEXT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auditor_comments_org_control
  ON auditor_comments (org_id, control_code);

CREATE TABLE control_signoffs (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id     TEXT NOT NULL REFERENCES auditor_sessions(id) ON DELETE CASCADE,
  control_code   TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  verdict        TEXT NOT NULL,
  note           TEXT,
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, control_code, framework_name)
);

CREATE INDEX control_signoffs_org_control
  ON control_signoffs (org_id, control_code);

-- ============================================
-- DATA FLYWHEEL
-- ============================================

CREATE TABLE org_profiles (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  industry     TEXT,
  company_size TEXT,
  tech_stack   TEXT[] NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE industry_benchmarks (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  framework    TEXT NOT NULL,
  industry     TEXT,
  company_size TEXT,
  control_code TEXT NOT NULL,
  pass_rate    FLOAT NOT NULL,
  avg_score    FLOAT NOT NULL,
  p25          FLOAT NOT NULL,
  p50          FLOAT NOT NULL,
  p75          FLOAT NOT NULL,
  sample_count INTEGER NOT NULL,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework, industry, company_size, control_code, computed_at)
);

CREATE INDEX industry_benchmarks_cohort
  ON industry_benchmarks (framework, industry, company_size, computed_at DESC);
