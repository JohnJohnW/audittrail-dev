import Link from "next/link";

export function CTA() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Ready to automate compliance evidence?
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Connect GitHub in 2 minutes. No credit card required.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block bg-gray-900 text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
        >
          Start free
        </Link>
      </div>
    </section>
  );
}
