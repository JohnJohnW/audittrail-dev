/**
 * GitHub-related Types
 */

// Pull request states
export type PRState = "open" | "closed" | "merged";

// Review states from GitHub API
export type ReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"
  | "PENDING";

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
