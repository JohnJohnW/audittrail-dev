export function Frameworks() {
  const frameworks = [
    {
      name: "ISO 27001:2022",
      description:
        "Information security management system standard. We map to Annex A controls relevant to software development.",
      controls: [
        "A.8.9 Configuration Management",
        "A.8.32 Change Management",
        "A.8.4 Access to Source Code",
        "A.8.25 Secure Development Life Cycle",
        "A.8.28 Secure Coding",
      ],
      badge: "10 controls mapped",
    },
    {
      name: "Essential Eight",
      description:
        "Australian Cyber Security Centre mitigation strategies. We map development controls to application hardening requirements.",
      controls: [
        "Application Control",
        "Patch Applications",
        "Restrict Administrative Privileges",
        "Patch Operating Systems",
        "Regular Backups",
      ],
      badge: "5 controls mapped",
    },
  ];

  return (
    <section id="frameworks" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Supported compliance frameworks
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We focus on frameworks where GitHub activity provides direct
            evidence of control implementation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {frameworks.map((framework, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {framework.name}
                </h3>
                <span className="bg-primary-50 text-primary-700 text-sm font-medium px-3 py-1 rounded-full">
                  {framework.badge}
                </span>
              </div>
              <p className="text-gray-600 mb-6">{framework.description}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Controls covered:
                </p>
                {framework.controls.map((control, idx) => (
                  <div key={idx} className="flex items-center text-sm">
                    <svg
                      className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-600">{control}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            More frameworks coming soon: SOC 2 Type II, NIST CSF
          </p>
        </div>
      </div>
    </section>
  );
}
