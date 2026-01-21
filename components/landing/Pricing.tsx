import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">
            Start free, upgrade when you need exports
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-gray-900">$0</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                "Up to 3 repositories",
                "GitHub integration",
                "View compliance evidence",
                "All frameworks supported",
                "Email support",
              ].map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <svg className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                No exports
              </li>
            </ul>

            <Link
              href="/auth/signin"
              className="block w-full text-center px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Get started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-white border border-gray-900 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-gray-900 text-white text-xs font-medium rounded">
              Popular
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-gray-900">$49</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                "Unlimited repositories",
                "All compliance frameworks",
                "Unlimited PDF exports",
                "Unlimited CSV exports",
                "Priority support",
                "Export history & audit log",
              ].map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-900 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/auth/signin"
              className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-gray-900 rounded-md text-white hover:bg-gray-800 transition-colors"
            >
              Start Pro trial
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Need enterprise features?{" "}
          <a href="mailto:hello@audittrail.dev" className="text-gray-900 hover:underline">
            Let&apos;s talk
          </a>
        </p>
      </div>
    </section>
  );
}
