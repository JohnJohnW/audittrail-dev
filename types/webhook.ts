/**
 * TypeScript interfaces for GitHub webhook payloads
 */

// Common types shared across webhook events
export interface WebhookRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface WebhookUser {
  id: number;
  login: string;
  type: string;
}

export interface WebhookOrganization {
  id: number;
  login: string;
}

// Push event
export interface PushWebhookPayload {
  ref: string;
  before: string;
  after: string;
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
  commits: PushWebhookCommit[];
  head_commit: PushWebhookCommit | null;
}

export interface PushWebhookCommit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

// Pull request event
export interface PullRequestWebhookPayload {
  action: string; // "opened" | "closed" | "reopened" | "synchronize" | "edited" | "review_requested" | ...
  number: number;
  pull_request: WebhookPullRequest;
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

export interface WebhookPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: WebhookUser;
  html_url: string;
  merged_at: string | null;
  closed_at: string | null;
  base: { ref: string };
  head: { ref: string };
}

// Pull request review event
export interface PullRequestReviewWebhookPayload {
  action: string; // "submitted" | "edited" | "dismissed"
  review: WebhookReview;
  pull_request: WebhookPullRequest;
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

export interface WebhookReview {
  id: number;
  user: WebhookUser;
  body: string | null;
  state: string; // "approved" | "changes_requested" | "commented" | "dismissed"
  submitted_at: string;
  html_url: string;
}

// Member event (org membership changes)
export interface MemberWebhookPayload {
  action: string; // "added" | "removed" | "edited"
  member: WebhookUser;
  changes?: {
    role_name?: {
      from: string;
    };
  };
  repository?: WebhookRepository;
  organization?: WebhookOrganization;
  sender: WebhookUser;
}

// Organization event
export interface OrganizationWebhookPayload {
  action: string; // "member_added" | "member_removed" | "member_invited"
  membership?: {
    user: WebhookUser;
    role: string; // "member" | "admin"
    organization: WebhookOrganization;
  };
  organization: WebhookOrganization;
  sender: WebhookUser;
}

// Check suite / workflow run event
export interface CheckSuiteWebhookPayload {
  action: string; // "completed" | "requested" | "rerequested"
  check_suite: {
    id: number;
    head_sha: string;
    status: string;
    conclusion: string | null;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

export interface WorkflowRunWebhookPayload {
  action: string; // "completed" | "requested"
  workflow_run: {
    id: number;
    name: string;
    head_sha: string;
    status: string;
    conclusion: string | null;
    html_url: string;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Branch protection rule event
export interface BranchProtectionRuleWebhookPayload {
  action: string; // "created" | "edited" | "deleted"
  rule: {
    id: number;
    name: string;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Deployment event
export interface DeploymentWebhookPayload {
  action: string;
  deployment: {
    id: number;
    environment: string;
    sha: string;
    ref: string;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// GitHub Actions artifact types
export interface GitHubWorkflowRunArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitHubArtifactsResponse {
  total_count: number;
  artifacts: GitHubWorkflowRunArtifact[];
}

// GitHub environment types
export interface GitHubEnvironment {
  id: number;
  name: string;
  html_url: string;
  protection_rules?: GitHubEnvironmentProtectionRule[];
  deployment_branch_policy?: {
    protected_branches: boolean;
    custom_branch_policies: boolean;
  } | null;
}

export interface GitHubEnvironmentProtectionRule {
  id: number;
  type: string; // "required_reviewers" | "wait_timer" | "branch_policy"
  reviewers?: Array<{
    type: string;
    reviewer: WebhookUser;
  }>;
  wait_timer?: number;
  prevent_self_review?: boolean;
}

export interface GitHubEnvironmentsResponse {
  total_count: number;
  environments: GitHubEnvironment[];
}

// Dependabot alert event
export interface DependabotAlertWebhookPayload {
  action: string; // "created" | "dismissed" | "auto_dismissed" | "fixed" | "reopened" | "auto_reopened" | "reintroduced"
  alert: {
    number: number;
    state: string; // "open" | "dismissed" | "fixed"
    dependency: {
      package: { ecosystem: string; name: string };
      manifest_path: string;
    };
    security_advisory: {
      ghsa_id: string;
      cve_id: string | null;
      summary: string;
      severity: "critical" | "high" | "medium" | "low";
    };
    security_vulnerability: {
      vulnerable_version_range: string;
      first_patched_version: { identifier: string } | null;
    };
    fixed_at: string | null;
    dismissed_at: string | null;
    html_url: string;
  };
  repository: WebhookRepository;
  organization?: WebhookOrganization;
  sender: WebhookUser;
}

// Code scanning alert event
export interface CodeScanningAlertWebhookPayload {
  action: string; // "created" | "reopened" | "closed_by_user" | "fixed" | "appeared_in_branch" | "reintroduced"
  alert: {
    number: number;
    state: string; // "open" | "dismissed" | "fixed"
    rule: {
      id: string;
      severity: string; // "none" | "note" | "warning" | "error"
      description: string;
      security_severity_level?: "critical" | "high" | "medium" | "low";
    };
    tool: { name: string; version: string | null };
    html_url: string;
    dismissed_at: string | null;
    fixed_at: string | null;
  };
  repository: WebhookRepository;
  organization?: WebhookOrganization;
  sender: WebhookUser;
}

// Secret scanning alert event
export interface SecretScanningAlertWebhookPayload {
  action: string; // "created" | "resolved" | "reopened" | "publicly_leaked" | "validated"
  alert: {
    number: number;
    state: string; // "open" | "resolved"
    secret_type: string;
    secret_type_display_name: string;
    resolution: string | null; // "false_positive" | "wont_fix" | "revoked" | "used_in_tests" | null
    resolved_at: string | null;
    html_url: string;
  };
  repository: WebhookRepository;
  organization?: WebhookOrganization;
  sender: WebhookUser;
}

// Deployment status event
export interface DeploymentStatusWebhookPayload {
  action: string; // "created"
  deployment_status: {
    id: number;
    state: string; // "error" | "failure" | "inactive" | "in_progress" | "queued" | "pending" | "success"
    description: string | null;
    environment: string;
    log_url: string | null;
    created_at: string;
    updated_at: string;
    creator: WebhookUser | null;
  };
  deployment: {
    id: number;
    sha: string;
    ref: string;
    environment: string;
    description: string | null;
    creator: WebhookUser | null;
    created_at: string;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Release event
export interface ReleaseWebhookPayload {
  action: string; // "published" | "unpublished" | "created" | "edited" | "deleted" | "prereleased" | "released"
  release: {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    html_url: string;
    created_at: string;
    published_at: string | null;
    author: WebhookUser;
    target_commitish: string;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Repository event (visibility changes, archiving, etc.)
export interface RepositoryWebhookPayload {
  action: string; // "created" | "deleted" | "archived" | "unarchived" | "publicized" | "privatized" | "renamed" | "transferred" | "edited"
  repository: WebhookRepository & {
    archived: boolean;
    disabled: boolean;
    visibility: string; // "public" | "private" | "internal"
  };
  changes?: {
    repository?: {
      name?: { from: string };
      description?: { from: string | null };
    };
  };
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Public event (repo changed from private to public — simplified payload)
export interface PublicWebhookPayload {
  repository: WebhookRepository & { private: false };
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Team event (team membership / permission changes)
export interface TeamWebhookPayload {
  action: string; // "created" | "deleted" | "edited" | "added_to_repository" | "removed_from_repository"
  team: {
    id: number;
    name: string;
    slug: string;
    permission: string; // "pull" | "push" | "admin" | "maintain" | "triage"
    privacy: string; // "secret" | "closed"
  };
  changes?: {
    permission?: { from: string };
    name?: { from: string };
    privacy?: { from: string };
    description?: { from: string | null };
  };
  repository?: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Security and analysis event (secret scanning, code scanning, dependabot feature toggled)
export interface SecurityAndAnalysisWebhookPayload {
  action: string; // "changed"
  changes: {
    security_and_analysis?: {
      advanced_security?: { from: string; to: string }; // "enabled" | "disabled"
      secret_scanning?: { from: string; to: string };
      secret_scanning_push_protection?: { from: string; to: string };
      dependabot_security_updates?: { from: string; to: string };
    };
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Deploy key event (deploy key added/removed from repository)
export interface DeployKeyWebhookPayload {
  action: string; // "created" | "deleted"
  key: {
    id: number;
    key: string;
    url: string;
    title: string;
    verified: boolean;
    created_at: string;
    read_only: boolean;
  };
  repository: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Repository ruleset event
export interface RepositoryRulesetWebhookPayload {
  action: string; // "created" | "deleted" | "edited"
  ruleset: {
    id: number;
    name: string;
    target: string; // "branch" | "tag"
    enforcement: string; // "disabled" | "active" | "evaluate"
    source_type: string;
    source: string;
  };
  changes?: Record<string, unknown>;
  repository?: WebhookRepository;
  sender: WebhookUser;
  organization?: WebhookOrganization;
}

// Union type for all webhook payloads
export type WebhookPayload =
  | PushWebhookPayload
  | PullRequestWebhookPayload
  | PullRequestReviewWebhookPayload
  | MemberWebhookPayload
  | OrganizationWebhookPayload
  | CheckSuiteWebhookPayload
  | WorkflowRunWebhookPayload
  | BranchProtectionRuleWebhookPayload
  | DeploymentWebhookPayload
  | DeploymentStatusWebhookPayload
  | ReleaseWebhookPayload
  | RepositoryWebhookPayload
  | PublicWebhookPayload
  | TeamWebhookPayload
  | SecurityAndAnalysisWebhookPayload
  | DeployKeyWebhookPayload
  | RepositoryRulesetWebhookPayload
  | DependabotAlertWebhookPayload
  | CodeScanningAlertWebhookPayload
  | SecretScanningAlertWebhookPayload;
