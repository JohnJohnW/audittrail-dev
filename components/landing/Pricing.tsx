import Link from "next/link";

export function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "For small teams getting started with compliance",
      features: [
        "Up to 3 repositories",
        "GitHub integration",
        "View compliance evidence",
        "ISO 27001 & Essential Eight",
        "Email support",
      ],
      limitations: ["No PDF/CSV exports", "No priority support"],
      cta: "Start Free",
      ctaStyle: "border border-gray-300 text-gray-700 hover:border-gray-400",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$49",
      period: "per month",
      description: "For teams actively preparing for audits",
      features: [
        "Unlimited repositories",
        "GitHub integration",
        "View compliance evidence",
        "ISO 27001 & Essential Eight",
        "Unlimited PDF exports",
        "Unlimited CSV exports",
        "Priority support",
        "Export history",
      ],
      limitations: [],
      cta: "Start Pro Trial",
      ctaStyle: "bg-primary-600 text-white hover:bg-primary-700",
      highlighted: true,
    },
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you need exports. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-xl p-8 ${
                plan.highlighted
                  ? "bg-primary-600 text-white ring-4 ring-primary-600 ring-offset-2"
                  : "bg-white border border-gray-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  plan.highlighted ? "text-white" : "text-gray-900"
                }`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline mb-2">
                <span
                  className={`text-4xl font-bold ${
                    plan.highlighted ? "text-white" : "text-gray-900"
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`ml-2 ${
                    plan.highlighted ? "text-primary-100" : "text-gray-500"
                  }`}
                >
                  /{plan.period}
                </span>
              </div>
              <p
                className={`mb-6 ${
                  plan.highlighted ? "text-primary-100" : "text-gray-600"
                }`}
              >
                {plan.description}
              </p>

              <Link
                href="/auth/signin"
                className={`block w-full text-center px-6 py-3 rounded-lg font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-white text-primary-600 hover:bg-gray-50"
                    : plan.ctaStyle
                }`}
              >
                {plan.cta}
              </Link>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <svg
                      className={`w-5 h-5 mr-3 flex-shrink-0 ${
                        plan.highlighted ? "text-primary-200" : "text-green-500"
                      }`}
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
                    <span
                      className={
                        plan.highlighted ? "text-white" : "text-gray-600"
                      }
                    >
                      {feature}
                    </span>
                  </div>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start">
                    <svg
                      className={`w-5 h-5 mr-3 flex-shrink-0 ${
                        plan.highlighted ? "text-primary-300" : "text-gray-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span
                      className={
                        plan.highlighted ? "text-primary-200" : "text-gray-400"
                      }
                    >
                      {limitation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
