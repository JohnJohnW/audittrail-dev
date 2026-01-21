/**
 * Shared API types for AuditTrail.dev
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
}

// Status enums
export type ExportStatus = "pending" | "completed" | "failed";
export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "free";
export type PRState = "open" | "closed" | "merged";
export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
export type MembershipRole = "member" | "admin" | "owner";
export type EvidenceStatus = "has_evidence" | "partial" | "no_evidence" | "limited";

// Compliance types
export interface ComplianceControl {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  evidenceType: string;
  status: EvidenceStatus;
  evidenceCount: number;
  evidence: EvidenceItem[];
  note?: string;
}

export interface EvidenceItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  url?: string;
  relevance?: "high" | "medium" | "low";
}

export interface EvidenceSummary {
  total: number;
  withEvidence: number;
  partial: number;
  limited: number;
  noEvidence: number;
  score: number;
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  controlCount: number;
}

// Repository types
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

// Trends types
export interface TrendData {
  dates: string[];
  commits: number[];
  pullRequests: number[];
  complianceScores: number[];
  evidenceCounts: number[];
}

// Export types
export interface Export {
  id: string;
  fileName: string;
  format: "pdf" | "csv";
  status: ExportStatus;
  createdAt: string;
  fileSize?: number;
}

// Settings types
export interface OrganizationSettings {
  name: string;
  slug: string;
}

export interface SubscriptionSettings {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

// Onboarding types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// Health check types
export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, HealthCheck>;
}
