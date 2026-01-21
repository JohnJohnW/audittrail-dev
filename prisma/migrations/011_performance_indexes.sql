-- Performance indexes for common query patterns
-- These indexes improve query performance across the application

-- Index for exports by user (for user-specific export history)
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);

-- Index for session cleanup (NextAuth session management)
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

-- Index for commits by author email (for author-based filtering/grouping)
CREATE INDEX IF NOT EXISTS idx_commits_author_email ON commits(author_email);

-- Index for pull requests by author (for detecting Dependabot/Renovate)
CREATE INDEX IF NOT EXISTS idx_prs_author_login ON pull_requests(author_login);

-- Index for reviews by reviewer (for reviewer-based queries)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_login ON reviews(reviewer_login);

-- Composite index for trends API date range queries on commits
CREATE INDEX IF NOT EXISTS idx_commits_repo_committed_at 
ON commits(repo_id, committed_at);

-- Composite index for PR merge date range queries
CREATE INDEX IF NOT EXISTS idx_prs_repo_merged_at 
ON pull_requests(repo_id, merged_at) 
WHERE merged_at IS NOT NULL;

-- Index for compliance snapshots date range queries
CREATE INDEX IF NOT EXISTS idx_snapshots_org_date_range 
ON compliance_snapshots(org_id, snapshot_date DESC);
