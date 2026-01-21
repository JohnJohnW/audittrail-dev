export function Careers() {
  const roles = [
    {
      title: "Founding Engineer",
      type: "Full-stack",
      location: "Remote (AU timezone preferred)",
      description: "Build core product features. TypeScript, Next.js, PostgreSQL. Early equity.",
    },
    {
      title: "Product Designer",
      type: "Design",
      location: "Remote",
      description: "Shape the UX for compliance teams. B2B SaaS, data visualization.",
    },
  ];

  return (
    <section id="careers" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Join us
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            We&apos;re hiring
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Small team building tools for security and compliance professionals. 
            Early stage, real customers, real revenue.
          </p>
        </div>

        <div className="space-y-3">
          {roles.map((role, index) => (
            <a
              key={index}
              href={`mailto:careers@audittrail.dev?subject=${encodeURIComponent(role.title + ' Application')}`}
              className="block border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {role.title}
                    </h3>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{role.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {role.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    {role.location}
                  </p>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors whitespace-nowrap">
                  Apply →
                </span>
              </div>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Don&apos;t see a fit? Reach out anyway—<a href="mailto:careers@audittrail.dev" className="hover:text-gray-600">careers@audittrail.dev</a>
        </p>
      </div>
    </section>
  );
}
