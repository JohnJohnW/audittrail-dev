"use client";

import Link from "next/link";
import { FadeInOnLoad } from "@/components/ui/Motion";

export function Hero() {
  return (
    <section className="pt-28 pb-16 px-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-light/30 via-white to-white pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center relative">
        <FadeInOnLoad delay={0}>
          <p className="text-sm text-gray-500 mb-4">
            SOC 2 · ISO 27001 · NIST CSF · NIST SP 800-53 · Essential Eight · PCI DSS
          </p>
        </FadeInOnLoad>

        <FadeInOnLoad delay={0.1}>
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.15] mb-6">
            You won&apos;t notice Audit Trail working.
            <br />
            <span className="relative">
              Your auditor will.
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-accent/30"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,8 Q50,0 100,8 T200,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
        </FadeInOnLoad>

        <FadeInOnLoad delay={0.2}>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Built for SaaS teams. Connect your GitHub repos once and Audit Trail maps every commit,
            PR, and deployment to six compliance frameworks — automatically and continuously. When
            your enterprise prospect asks for SOC 2, you&apos;re already ready.
          </p>
        </FadeInOnLoad>

        <FadeInOnLoad delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link
              href="/auth/signin"
              className="bg-accent text-white px-6 py-2.5 text-sm font-medium hover:bg-accent-hover transition-all duration-200 rounded-md hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
            >
              Start free
            </Link>
            <a
              href="#how-it-works"
              className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              See how it works →
            </a>
          </div>
        </FadeInOnLoad>

        <FadeInOnLoad delay={0.4}>
          <p className="text-xs text-gray-400">
            No credit card required · Read-only GitHub access · Setup in 2 minutes · $5/mo after
            trial
          </p>
        </FadeInOnLoad>
      </div>
    </section>
  );
}
