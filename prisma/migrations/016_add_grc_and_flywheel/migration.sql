-- Risk Treatments
CREATE TABLE IF NOT EXISTS risk_treatments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  treatment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  rationale TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  review_date TIMESTAMP,
  linked_github_issue TEXT,
  closed_at TIMESTAMP,
  closed_by_evidence TEXT,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, control_code, framework_name)
);

CREATE INDEX ON risk_treatments (org_id, status);

-- Gap Assignments
CREATE TABLE IF NOT EXISTS gap_assignments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  assignee_id TEXT NOT NULL REFERENCES users(id),
  assigned_by_id TEXT NOT NULL REFERENCES users(id),
  due_date TIMESTAMP,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, control_code, framework_name)
);

CREATE INDEX ON gap_assignments (org_id, status);
CREATE INDEX ON gap_assignments (assignee_id);

-- Audit Cycles
CREATE TABLE IF NOT EXISTS audit_cycles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework_name TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  auditor_name TEXT,
  auditor_firm TEXT,
  auditor_session_id TEXT,
  outcome TEXT,
  target_close_date TIMESTAMP,
  closed_at TIMESTAMP,
  evidence_snapshot_id TEXT,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON audit_cycles (org_id, status);

-- Audit Findings
CREATE TABLE IF NOT EXISTS audit_findings (
  id TEXT PRIMARY KEY,
  audit_cycle_id TEXT NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  auditor_notes TEXT,
  remediation_commitment TEXT,
  remediation_due_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON audit_findings (audit_cycle_id);
CREATE INDEX ON audit_findings (org_id, control_code);

-- Auditor Requests
CREATE TABLE IF NOT EXISTS auditor_requests (
  id TEXT PRIMARY KEY,
  audit_cycle_id TEXT NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code TEXT,
  framework_name TEXT,
  request_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id TEXT REFERENCES users(id),
  due_date TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON auditor_requests (audit_cycle_id);
CREATE INDEX ON auditor_requests (org_id, status);

-- Flywheel: Anonymized Auditor Signal Records (NO orgId)
CREATE TABLE IF NOT EXISTS auditor_signal_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  control_code TEXT NOT NULL,
  framework_name TEXT NOT NULL,
  verdict TEXT NOT NULL,
  mapping_confidence FLOAT,
  org_industry TEXT,
  org_size TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Flywheel: Anonymized Audit Outcome Records (NO orgId)
CREATE TABLE IF NOT EXISTS audit_outcome_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  finding_count INT NOT NULL DEFAULT 0,
  critical_finding_count INT NOT NULL DEFAULT 0,
  framework_score FLOAT NOT NULL DEFAULT 0,
  org_industry TEXT,
  org_size TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
