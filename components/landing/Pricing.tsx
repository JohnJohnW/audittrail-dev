"use client";

import Link from "next/link";
import { FadeIn, StaggerChildren } from "@/components/ui/Motion";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: null,
    highlight: false,
    features: [
      "Up to 2 repositories",
      "2 compliance frameworks",
      "Basic compliance dashboard",
      "Gap analysis with action steps",
    ],
    excluded: ["AI agent runs", "Policy generation", "Auditor portal or exports"],
    cta: "Get started",
    ctaHref: "/auth/signin",
  },
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "$990/year if paid annually",
    highlight: false,
    features: [
      "Up to 5 repositories",
      "All 6 compliance frameworks",
      "2 AI agent runs per month",
      "5 policy drafts per month",
      "Auditor portal with sign-offs",
      "PDF & CSV exports",
    ],
    excluded: [],
    cta: "Start with Starter",
    ctaHref: "/auth/signin",
  },
  {
    name: "Growth",
    price: "$199",
    period: "/month",
    description: "$1,990/year if paid annually",
    highlight: true,
    features: [
      "Unlimited repositories",
      "Unlimited AI agent runs",
      "Unlimited policy drafts",
      "Australian regulatory mapping (Essential Eight, Privacy Act 1988, APRA CPS 234)",
      "Full audit packages with timestamped evidence",
      "Security posture trends and readiness scoring",
      "Control effectiveness analysis",
    ],
    excluded: [],
    cta: "Start with Growth",
    ctaHref: "/auth/signin",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: null,
    description: "For teams with specific regulatory needs",
    highlight: false,
    features: [
      "Everything in Growth",
      "SSO / SAML authentication",
      "IRAP and HIPAA framework support",
      "Custom framework mappings",
      "Dedicated support and onboarding",
      "SLAs and uptime guarantees",
    ],
    excluded: [],
    cta: "Contact us",
    ctaHref: "/contact",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-2xl font-semibold text-gray-900">
            Transparent pricing. No sales call required.
          </h2>
          <p className="mt-3 text-sm text-gray-500 max-w-2xl mx-auto">
            Traditional compliance platforms start at $7,500-10,000/year and require a sales call
            before you see a number. Audit Trail is $99/month, self-serve, cancel anytime.
          </p>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg p-6 relative hover:shadow-lg transition-all duration-300 ${
                plan.highlight
                  ? "border-2 border-accent hover:shadow-accent/10"
                  : "border border-gray-200 hover:shadow-md"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-accent text-white text-xs font-medium rounded-full">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-500">{plan.period}</span>}
                </div>
                {plan.description && (
                  <p className="text-xs text-accent mt-1 font-medium">{plan.description}</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg
                      className={`w-4 h-4 ${plan.highlight ? "text-accent" : "text-green-500"} mt-0.5 flex-shrink-0`}
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
                {plan.excluded.map((feature, idx) => (
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
                href={plan.ctaHref}
                className={`block w-full text-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  plan.highlight
                    ? "bg-accent text-white hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </StaggerChildren>

        <FadeIn direction="up" delay={0.4}>
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Compliance consulting typically costs hundreds per hour. Audit Trail Growth covers
              what used to require expensive manual work.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.5}>
          <div className="mt-12 max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Built for Australian teams</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Essential Eight is a first-class framework in Audit Trail - not an afterthought. We
              map to the ACSC 2023 maturity model and include Australian regulatory crosswalk
              analysis (Privacy Act 1988, APRA CPS 234) on the Growth plan.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
