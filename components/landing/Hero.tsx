import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
          ISO 27001 & Essential Eight Ready
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
          Turn GitHub activity into{" "}
          <span className="text-primary-600">audit-ready evidence</span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Connect your repositories. We map your commits, pull requests, and
          branch protections to compliance controls. Export audit-ready reports
          in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signin"
            className="w-full sm:w-auto bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Start Free Trial
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400 transition-colors"
          >
            See How It Works
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          No credit card required. Free tier includes 3 repositories.
        </p>
      </div>
    </section>
  );
}
