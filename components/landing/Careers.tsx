export function Careers() {
  return (
    <section id="careers" className="py-20 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-900/50 text-primary-300 text-sm font-medium mb-6">
          We&apos;re Hiring
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">
          Help us build the future of compliance
        </h2>

        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
          We&apos;re a small team solving real problems for security and
          engineering leaders. If you&apos;re passionate about developer tools,
          compliance automation, or building products that matter, we&apos;d
          love to hear from you.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-10 text-left">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              Software Engineer (Full-Stack)
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Build integrations, design APIs, and ship features that help
              thousands of teams stay compliant.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                TypeScript
              </span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                Next.js
              </span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                PostgreSQL
              </span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">
              Product Designer
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Design intuitive interfaces for complex compliance workflows. Make
              security accessible.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                Figma
              </span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                B2B SaaS
              </span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                UX Research
              </span>
            </div>
          </div>
        </div>

        <a
          href="mailto:careers@audittrail.dev"
          className="inline-flex items-center bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Get in Touch
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </a>

        <p className="mt-6 text-sm text-gray-500">
          Remote-friendly. Competitive compensation. Real equity.
        </p>
      </div>
    </section>
  );
}
