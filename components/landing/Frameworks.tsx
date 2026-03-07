"use client";

import { FadeIn } from "@/components/ui/Motion";

const shieldIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const dbIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
    />
  </svg>
);

const lockIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const globeIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const frameworks = [
  {
    name: "ISO 27001:2022",
    controls: 10,
    description: "Annex A secure development & access controls",
    icon: shieldIcon,
  },
  {
    name: "Essential Eight",
    controls: 5,
    description: "ACSC maturity model (November 2023)",
    icon: dbIcon,
  },
  {
    name: "NIST CSF 2.0",
    controls: 7,
    description: "NIST Cybersecurity Framework (2024)",
    icon: shieldIcon,
  },
  {
    name: "NIST SP 800-53",
    controls: 7,
    description: "Security & privacy controls for federal systems",
    icon: lockIcon,
  },
  {
    name: "SOC 2",
    controls: 5,
    description: "Trust Services Criteria for service organisations",
    icon: shieldIcon,
  },
  {
    name: "GDPR",
    controls: 3,
    description: "EU General Data Protection Regulation",
    icon: globeIcon,
  },
  {
    name: "SOCI Act",
    controls: 4,
    description: "Australian critical infrastructure security obligations",
    icon: dbIcon,
  },
  {
    name: "PCI DSS 4.0",
    controls: 5,
    description: "Payment Card Industry Data Security Standard",
    icon: lockIcon,
  },
];

export function Frameworks() {
  return (
    <section id="frameworks" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Compliance Frameworks
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Pre-mapped compliance controls
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            We&apos;ve done the control mapping for you. Eight frameworks covering global and
            regional standards. Connect once, evidence them all.
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
            Need IRAP, HIPAA, or a custom framework? Contact us for Enterprise
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
