/**
 * GitHub-related Types
 */

// Pull request states
export type PRState = "open" | "closed" | "merged";

// Review states from GitHub API
export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";

/**
 * Repository as returned from list/selection endpoints.
 */
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  url: string;
  description: string | null;
  pushedAt: string;
  isTracked: boolean;
  isActive: boolean;
}

/**
 * Minimal repository reference used for filter dropdowns and selection UIs.
 * Use Repository for the full GitHub API shape.
 */
export interface RepositoryRef {
  id: string;
  fullName: string;
}

/**
 * Repository sync status.
 */
export interface RepositorySyncStatus {
  id: string;
  fullName: string;
  lastSyncedAt: string | null;
  commitCount: number;
  pullRequestCount: number;
  hasBranchProtection: boolean;
}

/**
 * Sync result for a single repository.
 */
export interface RepositorySyncResult {
  repository: string;
  commits?: number;
  pullRequests?: number;
  reviews?: number;
  branchProtection?: "synced" | "not configured" | "error";
  error?: string;
}

// =============================================================================
// GitHub API Raw Response Types
// =============================================================================

/** Raw repository shape from GitHub REST API. */
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  pushed_at: string;
  updated_at: string;
}

/** Raw commit shape from GitHub REST API. */
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    verification?: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  html_url: string;
  author: {
    login: string;
  } | null;
}

/** Raw pull request shape from GitHub REST API. */
export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
  };
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/** Raw review shape from GitHub REST API. */
export interface GitHubReview {
  id: number;
  user: {
    login: string;
  };
  state: string;
  body: string | null;
  submitted_at: string;
}

/** Raw branch protection shape from GitHub REST API. */
export interface GitHubBranchProtection {
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
  };
  enforce_admins?: {
    enabled: boolean;
  };
  required_status_checks?: {
    strict: boolean;
    contexts: string[];
  };
}
