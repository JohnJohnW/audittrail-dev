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
  | DeploymentWebhookPayload;
