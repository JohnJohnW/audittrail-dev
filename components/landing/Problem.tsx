"use client";

import { FadeIn } from "@/components/ui/Motion";

export function Problem() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-20">
          <FadeIn direction="right" delay={0}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">The problem</p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Compliance is treated as work
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Auditors ask for change management evidence. You spend hours screenshotting GitHub
                  PRs and commit logs.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Branch protection rules, code reviews, and deployment approvals live in different
                  places. Auditors want one package.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Mapping your Git workflow to ISO 27001, NIST CSF, GDPR, or SOC 2 requires
                  compliance expertise you don&apos;t have time for.
                </span>
              </li>
            </ul>
          </FadeIn>

          <FadeIn direction="left" delay={0.15}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">The solution</p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Compliance infrastructure. Not compliance overhead.
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Install once. Audit Trail watches everything. Webhooks stream commits, PRs,
                  reviews, Dependabot alerts, and deployment approvals in real time. No daily batch
                  lag.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Every artifact maps to specific controls across ISO 27001, NIST CSF, NIST SP
                  800-53, SOC 2, GDPR, SOCI Act, PCI DSS, Essential Eight, NIST 800-207, and ASD MDA
                  Foundations, automatically.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Only surfaces what matters. Critical gaps like secret leaks, unreviewed merges,
                  and disabled branch protection trigger alerts so you fix them before the auditor
                  arrives.
                </span>
              </li>
            </ul>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
