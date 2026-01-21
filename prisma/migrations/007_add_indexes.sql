-- Performance indexes for common queries

-- Repositories
CREATE INDEX IF NOT EXISTS idx_repositories_org_active ON repositories(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_repositories_synced ON repositories(last_synced_at) WHERE last_synced_at IS NOT NULL;

-- Commits
CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repo_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(committed_at DESC);

-- Pull Requests
CREATE INDEX IF NOT EXISTS idx_prs_repo_merged ON pull_requests(repo_id, merged_at DESC) WHERE merged_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prs_state ON pull_requests(state);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_pr_state ON reviews(pr_id, state);

-- Branch Protections
CREATE INDEX IF NOT EXISTS idx_branch_protections_repo ON branch_protections(repo_id, snapshot_at DESC);

-- Compliance Controls
CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_evidence ON compliance_controls(evidence_type);

-- Exports
CREATE INDEX IF NOT EXISTS idx_exports_org_created ON exports(org_id, created_at DESC);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON subscriptions(org_id, status);
