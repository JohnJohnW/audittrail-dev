const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Prevent the client-side router cache from serving stale server component
    // payloads for dynamic pages. Without this, navigating away from /compliance
    // and back to /dashboard can serve a cached (potentially errored) payload
    // for up to 30 seconds even though the page uses force-dynamic.
    staleTimes: {
      dynamic: 0,
    },
  },

  async headers() {
    return [
      {
        // Apply to every route
        source: "/(.*)",
        headers: [
          // Prevent browsers from MIME-sniffing away from the declared content-type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow embedding in iframes (clickjacking defence)
          { key: "X-Frame-Options", value: "DENY" },
          // Force HTTPS for 2 years, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Don't send the full URL as a Referer to third-party origins
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features this app doesn't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy (report-only to identify violations before enforcing)
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.posthog.com https://*.sentry.io https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;",
          },
          // Disable DNS prefetching (minor privacy improvement)
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
