-- Agent Governance: API Keys, Agent Sessions, Agent Events, APP Framework
-- This migration adds first-class support for autonomous agent auditing

-- ============================================
-- API Keys
-- ============================================
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_org_id_idx" ON "api_keys"("org_id");

ALTER TABLE "api_keys"
    ADD CONSTRAINT "api_keys_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Agent Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS "agent_sessions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "agent_framework" TEXT NOT NULL DEFAULT 'openclaw',
    "agent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_sessions_org_id_external_id_key" ON "agent_sessions"("org_id", "external_id");
CREATE INDEX IF NOT EXISTS "agent_sessions_org_id_started_at_idx" ON "agent_sessions"("org_id", "started_at");

ALTER TABLE "agent_sessions"
    ADD CONSTRAINT "agent_sessions_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Agent Events
-- ============================================
CREATE TABLE IF NOT EXISTS "agent_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "output" JSONB,
    "metadata" JSONB,
    "control_mappings" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_events_org_id_timestamp_idx" ON "agent_events"("org_id", "timestamp");
CREATE INDEX IF NOT EXISTS "agent_events_session_id_idx" ON "agent_events"("session_id");
CREATE INDEX IF NOT EXISTS "agent_events_category_idx" ON "agent_events"("category");

ALTER TABLE "agent_events"
    ADD CONSTRAINT "agent_events_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Seed: Australian Privacy Principles (APPs)
-- ============================================
INSERT INTO "compliance_frameworks" ("id", "name", "version", "description", "created_at")
VALUES (
    'framework_app',
    'Australian Privacy Principles',
    '2024',
    'The Australian Privacy Principles (APPs) under the Privacy Act 1988 regulate how personal information is handled by Australian Government agencies and private sector organisations.',
    CURRENT_TIMESTAMP
) ON CONFLICT ("name") DO NOTHING;

-- APP Controls (agent_activity evidence type for agent-sourced evidence)
INSERT INTO "compliance_controls" ("id", "framework_id", "code", "title", "description", "evidence_type", "created_at")
VALUES
    ('ctrl_app1', 'framework_app', 'APP-1', 'Open and Transparent Management',
     'Organisations must manage personal information in an open and transparent way, including having an up-to-date APP privacy policy.',
     'agent_activity', CURRENT_TIMESTAMP),
    ('ctrl_app6', 'framework_app', 'APP-6', 'Use or Disclosure of Personal Information',
     'Organisations must not use or disclose personal information for a purpose other than the primary purpose of collection, unless an exception applies.',
     'agent_activity', CURRENT_TIMESTAMP),
    ('ctrl_app8', 'framework_app', 'APP-8', 'Cross-border Disclosure',
     'Before disclosing personal information to an overseas recipient, organisations must take reasonable steps to ensure compliance with the APPs.',
     'agent_activity', CURRENT_TIMESTAMP),
    ('ctrl_app11', 'framework_app', 'APP-11', 'Security of Personal Information',
     'Organisations must take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access, modification, or disclosure.',
     'agent_activity', CURRENT_TIMESTAMP),
    ('ctrl_app12', 'framework_app', 'APP-12', 'Access to Personal Information',
     'Organisations must give individuals access to their personal information on request.',
     'agent_activity', CURRENT_TIMESTAMP),
    ('ctrl_app13', 'framework_app', 'APP-13', 'Correction of Personal Information',
     'Organisations must take reasonable steps to correct personal information to ensure it is accurate, up-to-date, complete, relevant, and not misleading.',
     'agent_activity', CURRENT_TIMESTAMP)
ON CONFLICT ("framework_id", "code") DO NOTHING;
