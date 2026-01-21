import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm text-gray-500 mb-4">
          For ISO 27001, SOC 2, Essential Eight, NIST CSF & GDPR
        </p>
        
        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.15] mb-6">
          Audit evidence from
          <br />
          your Git history
        </h1>

        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
          Connect your GitHub repositories. We extract commits, pull requests, 
          reviews, and branch protection rules—then map them to compliance 
          controls. Export audit-ready reports in one click.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href="/auth/signin"
            className="bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
          >
            Start free
          </Link>
          <a
            href="#how-it-works"
            className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            See how it works →
          </a>
        </div>

        <p className="text-xs text-gray-400">
          No credit card required · Read-only GitHub access · Setup in 2 minutes
        </p>
      </div>
    </section>
  );
}
