-- Create compliance_snapshots table for storing daily compliance scores
-- This enables accurate historical trend data instead of on-the-fly calculations

CREATE TABLE IF NOT EXISTS compliance_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  overall_score INTEGER NOT NULL,
  total_controls INTEGER NOT NULL,
  with_evidence INTEGER NOT NULL,
  partial INTEGER NOT NULL,
  limited INTEGER NOT NULL DEFAULT 0,
  no_evidence INTEGER NOT NULL,
  framework_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint to prevent duplicate snapshots for same org/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_org_date 
ON compliance_snapshots(org_id, snapshot_date);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_snapshots_date 
ON compliance_snapshots(snapshot_date);

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_org 
ON compliance_snapshots(org_id);

-- Add verified field to commits for signed commit detection
ALTER TABLE commits ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE commits ADD COLUMN IF NOT EXISTS verification_reason TEXT;
