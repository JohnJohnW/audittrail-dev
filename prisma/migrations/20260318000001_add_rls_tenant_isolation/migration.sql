-- Zero Trust: Row-Level Security for multi-tenant isolation
-- Even if app-layer orgId filtering has a bug, the DB enforces isolation

-- Enable RLS on all tables that contain org-scoped data
ALTER TABLE "Repository" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PullRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BranchProtection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ControlNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ControlStatusSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskTreatment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GapAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditFinding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditorRequest" ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (Prisma server-side uses service role - this is correct)
-- RLS blocks direct DB access from compromised app-layer context

-- Policies: allow access only when app.current_org_id matches
-- These policies apply to non-service-role connections

CREATE POLICY org_isolation_repository ON "Repository"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_commit ON "Commit"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_pullrequest ON "PullRequest"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_review ON "Review"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_branchprotection ON "BranchProtection"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_compliancesnapshot ON "ComplianceSnapshot"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_controlnote ON "ControlNote"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_evidenceexception ON "EvidenceException"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_controlstatussnapshot ON "ControlStatusSnapshot"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_webhookevent ON "WebhookEvent"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_risktreatment ON "RiskTreatment"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_gapassignment ON "GapAssignment"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_auditcycle ON "AuditCycle"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_auditfinding ON "AuditFinding"
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_auditorrequest ON "AuditorRequest"
  USING (org_id = current_setting('app.current_org_id', true));
