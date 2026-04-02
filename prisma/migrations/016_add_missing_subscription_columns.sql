-- Add missing trial columns to subscriptions table
-- and create org_calc_configs table that exists in schema.prisma but was never migrated

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_exports_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_auditor_sessions_used INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS org_calc_configs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id     TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  config     JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
