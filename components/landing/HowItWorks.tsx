export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect GitHub",
      description: "Read-only access. Select which repositories to track.",
    },
    {
      number: "02",
      title: "Auto-map controls",
      description:
        "We pull commits, PRs, reviews, and branch protections. Each mapped to compliance controls.",
    },
    {
      number: "03",
      title: "Export evidence",
      description: "Generate PDF or CSV reports. Present to auditors.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">
            Three steps to audit-ready
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-5xl font-light text-gray-200 mb-4">
                {step.number}
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
