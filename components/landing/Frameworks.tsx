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

const primaryFrameworks = [
  {
    name: "SOC 2",
    version: "2022",
    controls: 5,
    description: "Trust Services Criteria: change management, access control, monitoring",
    icon: shieldIcon,
  },
  {
    name: "ISO 27001",
    version: "2022",
    controls: 10,
    description: "Annex A technological controls: secure development and access management",
    icon: shieldIcon,
  },
  {
    name: "NIST CSF",
    version: "2.0",
    controls: 7,
    description: "Govern, Protect, and Detect functions: partial adoption is by design",
    icon: lockIcon,
  },
];

const extendedFrameworks = [
  {
    name: "NIST SP 800-53",
    version: "Rev 5",
    controls: 7,
    description: "Selected SDLC controls: CM-3, SI-2, CA-7, SA-10, SA-11, AC-2, CM-4",
    icon: lockIcon,
  },
  {
    name: "ACSC Essential Eight",
    version: "2023",
    controls: 5,
    description:
      "5 of 8 strategies with GitHub-evidenceable activity. Evidence-based, not maturity-level assessed.",
    icon: dbIcon,
  },
  {
    name: "PCI DSS",
    version: "4.0",
    controls: 5,
    description: "Requirements 6, 7, 8: secure development, access control, and authentication",
    icon: lockIcon,
  },
];

function FrameworkRow({ framework }: { framework: (typeof primaryFrameworks)[0] }) {
  return (
    <tr className="hover:bg-accent-light/50 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-accent-light group-hover:text-accent transition-colors">
            {framework.icon}
          </span>
          <div>
            <span className="text-sm font-medium text-gray-900">{framework.name}</span>
            <span className="ml-2 text-xs text-gray-400">{framework.version}</span>
          </div>
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
  );
}

export function Frameworks() {
  return (
    <section id="frameworks" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Compliance Frameworks
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Six frameworks. Zero manual work.
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            We have done the control mapping for you. All 39 controls cover the technical SDLC
            activity that lives in your GitHub repos: change management, access control,
            vulnerability management, and security testing.
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
                <tr>
                  <td colSpan={3} className="px-4 py-2 bg-accent-light/30">
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Primary
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      strongest GitHub evidence coverage, most auditor-accepted
                    </span>
                  </td>
                </tr>
                {primaryFrameworks.map((framework, index) => (
                  <FrameworkRow key={index} framework={framework} />
                ))}
                <tr>
                  <td colSpan={3} className="px-4 py-2 bg-gray-50/80 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Extended
                    </span>
                    <span className="ml-2 text-xs text-gray-400">specific regulatory contexts</span>
                  </td>
                </tr>
                {extendedFrameworks.map((framework, index) => (
                  <FrameworkRow key={index} framework={framework} />
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.4}>
          <p className="text-center text-xs text-gray-400 mt-6">
            Need IRAP, HIPAA, or a custom framework?{" "}
            <a href="/contact" className="text-accent hover:underline">
              Contact us
            </a>{" "}
            for Enterprise
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
