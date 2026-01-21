"use client";

import { FadeIn } from "@/components/ui/FadeIn";

export function Problem() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 md:gap-20">
          <FadeIn direction="right" delay={0}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
              The problem
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Audit prep is painful
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Auditors ask for change management evidence. You spend hours
                  screenshotting GitHub PRs and commit logs.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Branch protection rules, code reviews, and deployment approvals
                  live in different places. Auditors want one package.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ×
                </span>
                <span className="text-gray-600">
                  Mapping your Git workflow to ISO 27001 A.12.1.2 or SOC 2 CC6.1
                  requires compliance expertise you don&apos;t have time for.
                </span>
              </li>
            </ul>
          </FadeIn>

          <FadeIn direction="left" delay={0.15}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
              The solution
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              One-click evidence packs
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Connect GitHub once. We automatically pull commits, PRs,
                  reviews, and branch protection settings daily.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Every artifact maps to specific compliance controls. ISO 27001
                  Annex A, SOC 2 Trust Services Criteria, Essential Eight—all covered.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Export PDF reports or CSV tables that auditors understand.
                  No more manual evidence gathering.
                </span>
              </li>
            </ul>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
