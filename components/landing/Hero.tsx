import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-gray-900 tracking-tight leading-[1.1] mb-6">
          Compliance evidence
          <br />
          from your Git history
        </h1>

        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Connect GitHub. We map commits, PRs, and branch protection to
          compliance controls. Export audit-ready reports in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signin"
            className="bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
          >
            Start free — no credit card
          </Link>
          <a
            href="#how-it-works"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            See how it works →
          </a>
        </div>
      </div>
    </section>
  );
}
