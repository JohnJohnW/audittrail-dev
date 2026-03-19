import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - sample at 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay disabled (we use PostHog for that)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",

  // Scrub PII from error reports
  beforeSend(event) {
    // Remove user email from breadcrumbs and error data
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      // Keep only the anonymous id
    }
    return event;
  },
});
