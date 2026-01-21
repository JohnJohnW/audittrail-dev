"use client";

import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | "signup"
  | "github_connect"
  | "repo_select"
  | "repo_sync"
  | "export_generate"
  | "subscription_start"
  | "subscription_cancel"
  | "onboarding_complete"
  | "page_view"
  | "conversion";

type AnalyticsValue = string | number | boolean | null | undefined;

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, AnalyticsValue>) {
  if (typeof window !== "undefined") {
    track(event, properties);
  }
}

export function trackConversion(step: string, value?: number) {
  trackEvent("conversion", { step, value });
}
