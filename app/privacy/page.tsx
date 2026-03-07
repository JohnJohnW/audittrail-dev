import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Audit Trail",
  description: "Privacy Policy for Audit Trail",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Audit <span className="text-accent">Trail</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none text-sm text-gray-600 space-y-6">
          <p className="text-gray-500">Last updated: January 2025</p>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Overview</h2>
            <p>
              Audit Trail (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to
              protecting your privacy. This policy explains how we collect, use, and protect your
              data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Data We Collect</h2>

            <h3 className="text-base font-medium text-gray-900 mt-6 mb-2">Account Information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address (for authentication and communication)</li>
              <li>Name (from GitHub profile)</li>
              <li>Organization name</li>
            </ul>

            <h3 className="text-base font-medium text-gray-900 mt-6 mb-2">
              GitHub Repository Metadata
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Repository names and IDs</li>
              <li>Commit metadata (hash, author, timestamp, message)</li>
              <li>Pull request metadata (number, title, author, status)</li>
              <li>Code review information (reviewer, approval status)</li>
              <li>Branch protection configurations</li>
            </ul>
            <p className="mt-2 font-medium text-gray-900">
              We never store your source code or file contents.
            </p>

            <h3 className="text-base font-medium text-gray-900 mt-6 mb-2">Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store credit card numbers. Stripe
              may collect payment details in accordance with their privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Generate compliance evidence reports from your GitHub activity</li>
              <li>Map repository metadata to compliance framework controls</li>
              <li>Send transactional emails (verification, export completion)</li>
              <li>Process subscription payments</li>
              <li>Improve our service and fix issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Data Security</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>All data is encrypted in transit (TLS 1.3)</li>
              <li>Data at rest is encrypted</li>
              <li>GitHub tokens are securely stored and encrypted</li>
              <li>We use Supabase for database hosting with enterprise-grade security</li>
              <li>Regular security reviews and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your
              account, we delete your data within 30 days, except where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>GitHub</strong> - Repository data access (via OAuth)
              </li>
              <li>
                <strong>Stripe</strong> - Payment processing
              </li>
              <li>
                <strong>Supabase</strong> - Database hosting
              </li>
              <li>
                <strong>Vercel</strong> - Application hosting
              </li>
              <li>
                <strong>Resend</strong> - Transactional email
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Revoke GitHub access at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use
              tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify users of significant
              changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mt-8 mb-4">Contact</h2>
            <p>
              For privacy-related questions,{" "}
              <a
                href="https://github.com/JohnJohnW/audittrail-dev/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:underline"
              >
                open an issue on GitHub
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
