export function Careers() {
  const roles = [
    {
      title: "Software Engineer",
      type: "Full-stack",
      skills: "TypeScript, Next.js, PostgreSQL",
    },
    {
      title: "Product Designer",
      type: "Design",
      skills: "B2B SaaS, developer tools",
    },
  ];

  return (
    <section id="careers" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Careers
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Join us
          </h2>
          <p className="text-sm text-gray-500">
            Small team. Real problems. Remote-friendly.
          </p>
        </div>

        <div className="space-y-3">
          {roles.map((role, index) => (
            <a
              key={index}
              href="mailto:careers@audittrail.dev"
              className="block border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {role.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {role.type} · {role.skills}
                  </p>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">
                  Apply →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
