/**
 * Application constants for AuditTrail.dev
 */

// API and sync configuration
export const SYNC_CONFIG = {
  /** Maximum pages to fetch from GitHub API during sync */
  MAX_PAGES: 10,
  /** Maximum pages to fetch during cron sync (shorter to avoid timeout) */
  CRON_MAX_PAGES: 3,
  /** Number of items to process in parallel batches */
  BATCH_SIZE: 25,
  /** Maximum reviews to fetch per PR */
  REVIEW_LIMIT: 20,
  /** Maximum reviews to fetch per PR during cron sync */
  CRON_REVIEW_LIMIT: 10,
} as const;

// GitHub API configuration
export const GITHUB_CONFIG = {
  /** Base URL for GitHub API */
  API_BASE: "https://api.github.com",
  /** Default timeout for GitHub API requests in milliseconds */
  TIMEOUT_MS: 30000,
  /** Items per page for GitHub API pagination */
  PER_PAGE: 100,
} as const;

// Subscription limits
export const PLAN_LIMITS = {
  /** Maximum repositories for free plan */
  FREE_REPO_LIMIT: 3,
  /** Maximum repositories for pro plan (unlimited) */
  PRO_REPO_LIMIT: Infinity,
} as const;

// Data limits
export const DATA_LIMITS = {
  /** Maximum commit message length to store */
  MAX_COMMIT_MESSAGE_LENGTH: 5000,
  /** Maximum PR body length to store */
  MAX_PR_BODY_LENGTH: 10000,
  /** Maximum review body length to store */
  MAX_REVIEW_BODY_LENGTH: 5000,
} as const;

// Trends configuration
export const TRENDS_CONFIG = {
  /** Default number of days for trend data */
  DEFAULT_DAYS: 30,
  /** Minimum allowed days for trend query */
  MIN_DAYS: 1,
  /** Maximum allowed days for trend query */
  MAX_DAYS: 365,
} as const;

// Export statuses
export const EXPORT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// PR states
export const PR_STATE = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
} as const;

// Review states
export const REVIEW_STATE = {
  APPROVED: "APPROVED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  COMMENTED: "COMMENTED",
  DISMISSED: "DISMISSED",
  PENDING: "PENDING",
} as const;

// Evidence statuses
export const EVIDENCE_STATUS = {
  HAS_EVIDENCE: "has_evidence",
  PARTIAL: "partial",
  LIMITED: "limited",
  NO_EVIDENCE: "no_evidence",
} as const;

// Subscription plans
export const SUBSCRIPTION_PLAN = {
  FREE: "free",
  PRO: "pro",
} as const;

// Membership roles
export const MEMBERSHIP_ROLE = {
  MEMBER: "member",
  ADMIN: "admin",
  OWNER: "owner",
} as const;
