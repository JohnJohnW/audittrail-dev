/**
 * PostHog analytics client - configured conservatively for B2B compliance SaaS.
 * Privacy principles:
 * - Identify by orgId only, never by email or personal name
 * - Mask all text inputs (session replay safe)
 * - No PII in event properties
 * - Respect Do Not Track headers
 */

export const POSTHOG_CONFIG = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
  // Session replay with PII masking
  session_recording: {
    maskAllInputs: true,
    maskAllText: false,
    blockClass: "ph-no-capture", // Add class to elements to block capture
  },
  // Respect privacy signals
  respect_dnt: true,
  // Disable autocapture of sensitive data
  autocapture: {
    dom_event_allowlist: ["click"],
    url_allowlist: ["/dashboard", "/compliance", "/evidence", "/onboarding"],
    element_allowlist: ["a", "button"],
  },
  persistence: "localStorage" as const,
  capture_pageview: false, // Manual pageview control
};

// B2B funnel events (no PII)
export const FUNNEL_EVENTS = {
  SIGNUP_COMPLETED: "signup_completed",
  GITHUB_APP_INSTALLED: "github_app_installed",
  FIRST_SYNC_COMPLETED: "first_sync_completed",
  FIRST_EVIDENCE_VIEWED: "first_evidence_viewed",
  FRAMEWORK_SELECTED: "framework_selected",
  FIRST_EXPORT_COMPLETED: "first_export_completed",
  PRO_UPGRADE_INITIATED: "pro_upgrade_initiated",
  PRO_UPGRADE_COMPLETED: "pro_upgrade_completed",
  AUDIT_CYCLE_CREATED: "audit_cycle_created",
  AUDITOR_SESSION_SHARED: "auditor_session_shared",
} as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];
