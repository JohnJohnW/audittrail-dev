import Link from "next/link";

export function CTA() {
  return (
    <section className="py-20 px-6 border-t border-gray-100">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Stop screenshotting GitHub for auditors
        </h2>
        <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
          Connect your repositories and generate your first compliance report 
          in under 10 minutes. Free to start.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signin"
            className="bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
          >
            Get started free
          </Link>
          <a
            href="mailto:hello@audittrail.dev"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Questions? Email us
          </a>
        </div>
      </div>
    </section>
  );
}
