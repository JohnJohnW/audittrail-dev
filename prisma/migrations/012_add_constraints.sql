-- Database constraints for data integrity
-- These ensure valid enum-like values at the database level

-- Export status constraint
DO $$ BEGIN
  ALTER TABLE exports ADD CONSTRAINT chk_export_status 
    CHECK (status IN ('pending', 'completed', 'failed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Subscription plan constraint
DO $$ BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_plan 
    CHECK (plan IN ('free', 'pro'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Pull request state constraint
DO $$ BEGIN
  ALTER TABLE pull_requests ADD CONSTRAINT chk_pr_state 
    CHECK (state IN ('open', 'closed', 'merged'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Review state constraint (GitHub review states)
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT chk_review_state 
    CHECK (state IN ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Organization membership role constraint
DO $$ BEGIN
  ALTER TABLE org_memberships ADD CONSTRAINT chk_membership_role 
    CHECK (role IN ('member', 'admin', 'owner'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Compliance snapshot score bounds
DO $$ BEGIN
  ALTER TABLE compliance_snapshots ADD CONSTRAINT chk_snapshot_score_bounds 
    CHECK (overall_score >= 0 AND overall_score <= 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
