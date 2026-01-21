/**
 * API Types
 *
 * Generic API response types and re-exports from domain-specific type files.
 */

// Re-export all domain types for convenience
export * from "./compliance";
export * from "./github";
export * from "./subscription";
export * from "./export";

// =============================================================================
// Generic API Response Types
// =============================================================================

/**
 * Generic API response wrapper.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Success response for mutation operations.
 */
export interface MutationResponse {
  success: boolean;
  message?: string;
}

// =============================================================================
// Feature-specific API Types
// =============================================================================

/**
 * Trend data for analytics.
 */
export interface TrendData {
  dates: string[];
  commits: number[];
  pullRequests: number[];
  complianceScores: number[];
  evidenceCounts: number[];
}

/**
 * Onboarding step definition.
 */
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

/**
 * Health check for a single service.
 */
export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
}

/**
 * Health check response with all service statuses.
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, HealthCheck>;
}
