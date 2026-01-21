"use client";

import { FadeIn } from "@/components/ui/Motion";

const frameworks = [
  {
    name: "ISO 27001:2022",
    controls: 18,
    description: "Annex A secure development & access controls",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    name: "Essential Eight",
    controls: 8,
    description: "ACSC maturity model (November 2023)",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
    ),
  },
];

export function Frameworks() {
  return (
    <section id="frameworks" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Australian Frameworks
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Pre-mapped compliance controls
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            We&apos;ve done the control mapping for you. ISO 27001 and ACSC Essential Eight—the
            frameworks Australian businesses need most.
          </p>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Framework
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Coverage
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {frameworks.map((framework, index) => (
                  <tr key={index} className="hover:bg-accent-light/50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-accent-light group-hover:text-accent transition-colors">
                          {framework.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{framework.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                      {framework.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-gray-100 text-sm font-medium text-gray-700 group-hover:bg-accent group-hover:text-white transition-colors">
                        {framework.controls}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.4}>
          <p className="text-center text-xs text-gray-400 mt-6">
            Need IRAP or other Australian frameworks? Contact us for Enterprise
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
