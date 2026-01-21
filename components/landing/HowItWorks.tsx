export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Connect GitHub",
      description:
        "Authorize read-only access to your repositories. We never modify your code or settings. Takes 30 seconds.",
    },
    {
      number: "2",
      title: "We map to controls",
      description:
        "Every commit, PR, review, and branch rule is automatically mapped to compliance framework controls.",
    },
    {
      number: "3",
      title: "Export evidence",
      description:
        "Generate audit-ready PDFs or CSV files. Each report shows control coverage with supporting evidence.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">
            From GitHub to audit report in 3 steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium mb-4">
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

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Average time from signup to first export:{" "}
            <span className="font-medium text-gray-900">under 10 minutes</span>
          </p>
        </div>
      </div>
    </section>
  );
}
