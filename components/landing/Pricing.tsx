"use client";

import Link from "next/link";
import { FadeIn, StaggerChildren } from "@/components/ui/Motion";

const FREE_FEATURES = [
  "Up to 2 repositories",
  "2 compliance frameworks",
  "Live compliance scoring & evidence dashboard",
  "Gap analysis with prioritised action steps",
  "Basic compliance alerts",
  "Control notes & exceptions",
];

const FREE_EXCLUDED = ["Exports, auditor portal, or shareable reports"];

const PRO_FEATURES = [
  "Unlimited repositories",
  "All 6 frameworks (SOC 2, ISO 27001, NIST CSF, NIST 800-53, Essential Eight, PCI DSS)",
  "PDF & CSV compliance exports",
  "Auditor portal with comments, sign-offs, and evidence ZIP",
  "Shareable read-only reports for due diligence",
  "Security posture trends and readiness scoring",
  "Advanced alerts & full alert history",
  "Control effectiveness analysis (NIST SP 800-53A methodology)",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-2xl font-semibold text-gray-900">
            14-day Pro trial included. No credit card required.
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Every account starts with full Pro access. Downgrade to free or subscribe when
            you&apos;re ready.
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-2 gap-6" staggerDelay={0.15}>
          {/* Free Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-300">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-gray-900">$0</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
              {FREE_EXCLUDED.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-400">
                  <svg
                    className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/auth/signin"
              className="block w-full text-center px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Get started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-white border-2 border-accent rounded-lg p-6 relative hover:shadow-lg hover:shadow-accent/10 transition-all duration-300">
            <div className="absolute -top-3 left-4 px-3 py-0.5 bg-accent text-white text-xs font-medium rounded-full">
              Most popular
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-gray-900">$5</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="text-xs text-accent mt-1 font-medium">
                14-day free trial · 3 exports · 1 auditor session
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 text-accent mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/auth/signin"
              className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-accent rounded-md text-white hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20 transition-all duration-200"
            >
              Start Pro trial
            </Link>
          </div>
        </StaggerChildren>

        <FadeIn direction="up" delay={0.4}>
          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-gray-400">
              Covers SDLC controls evidenced by GitHub activity: change management, access control,
              vulnerability management, and security testing. For HR policies, vendor risk, and
              physical security, Audit Trail tells you what&apos;s missing.
            </p>
            <p className="text-sm text-gray-500">
              Need enterprise features like SSO, IRAP, or HIPAA?{" "}
              <a href="/contact" className="text-accent hover:underline">
                Let&apos;s talk
              </a>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
