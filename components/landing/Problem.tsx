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
              Your enterprise deal needs SOC 2. You have 6 engineers.
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  x
                </span>
                <span className="text-gray-600">
                  Enterprise prospects ask for compliance evidence. You spend hours screenshotting
                  GitHub PRs and writing up change management narratives.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  x
                </span>
                <span className="text-gray-600">
                  Mapping your Git workflow to SOC 2, ISO 27001, or NIST CSF requires compliance
                  expertise you don&apos;t have and can&apos;t afford to hire for.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  x
                </span>
                <span className="text-gray-600">
                  You&apos;re already doing the right things in GitHub — code reviews, branch
                  protection, dependency updates. But none of it is captured as compliance evidence.
                </span>
              </li>
            </ul>
          </FadeIn>

          <FadeIn direction="left" delay={0.15}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">The solution</p>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Turn your GitHub activity into compliance evidence. Automatically.
            </h2>
            <ul className="space-y-4 text-[15px] leading-relaxed">
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Install once. Audit Trail watches everything — commits, PRs, reviews, Dependabot
                  alerts, branch protection, deployments — and maps them to 39 controls across 6
                  frameworks.
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Not just checkboxes — Audit Trail measures control effectiveness using NIST SP
                  800-53A methodology. Are your PR reviews substantive or rubber-stamps? Are
                  dependency patches applied in days or weeks?
                </span>
              </li>
              <li className="flex gap-3 group">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-gray-600">
                  Covers the technical SDLC controls that live in your repos. For everything else —
                  HR policies, vendor risk, physical security — Audit Trail tells you exactly
                  what&apos;s missing so you know where to focus.
                </span>
              </li>
            </ul>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
