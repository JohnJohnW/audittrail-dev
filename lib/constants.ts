/**
 * Application constants for AuditTrail.dev
 */

// API and sync configuration
export const SYNC_CONFIG = {
  /** Maximum pages to fetch from GitHub API during sync */
  MAX_PAGES: 10,
  /** Maximum pages to fetch during cron sync (shorter to avoid timeout) */
  CRON_MAX_PAGES: 3,
  /** Maximum PR pages to fetch during cron sync */
  CRON_MAX_PR_PAGES: 2,
  /** Number of items to process in parallel batches */
  BATCH_SIZE: 25,
  /** Maximum reviews to fetch per PR */
  REVIEW_LIMIT: 20,
  /** Maximum reviews to fetch per PR during cron sync */
  CRON_REVIEW_LIMIT: 10,
  /** Default days to look back if no lastSyncedAt exists */
  DEFAULT_DAYS_BACK: 90,
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

// Export configuration
export const EXPORT_CONFIG = {
  /** Maximum exports to return per page in list */
  MAX_EXPORTS_PER_PAGE: 20,
  /** Maximum concurrent export operations */
  MAX_CONCURRENT: 3,
} as const;

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  /** Timeout for database health check in milliseconds */
  TIMEOUT_MS: 5000,
} as const;

// Agent governance configuration
export const AGENT_CONFIG = {
  /** API key prefix for identification */
  API_KEY_PREFIX: "atk_",
  /** Maximum events per ingestion batch */
  MAX_EVENTS_PER_BATCH: 100,
  /** Maximum sessions to return per page */
  MAX_SESSIONS_PER_PAGE: 50,
  /** Maximum events to return per session detail */
  MAX_EVENTS_PER_SESSION: 500,
  /** Maximum API keys per organization */
  MAX_KEYS_PER_ORG: 10,
  /** Event categories */
  EVENT_CATEGORIES: [
    "shell_exec",
    "file_write",
    "file_read",
    "network_request",
    "browser_action",
    "credential_access",
    "session_management",
    "agent_routing",
    "system_config",
  ] as const,
  /** Risk levels */
  RISK_LEVELS: ["low", "medium", "high", "critical"] as const,
  /** Session statuses */
  SESSION_STATUSES: ["running", "completed", "failed", "timeout"] as const,
  /** Agent frameworks */
  FRAMEWORKS: ["openclaw"] as const,
} as const;

export type AgentEventCategory = (typeof AGENT_CONFIG.EVENT_CATEGORIES)[number];
export type AgentRiskLevel = (typeof AGENT_CONFIG.RISK_LEVELS)[number];
export type AgentSessionStatus = (typeof AGENT_CONFIG.SESSION_STATUSES)[number];

// HTTP status codes for consistency
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
