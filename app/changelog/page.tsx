import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog - Audit Trail",
  description: "Recent updates and improvements to Audit Trail",
};

interface ChangelogEntry {
  date: string;
  version: string;
  type: "feature" | "improvement" | "fix";
  title: string;
  description: string;
}

const changelog: ChangelogEntry[] = [
  {
    date: "2026-03-07",
    version: "1.1.0",
    type: "feature",
    title: "Expanded Compliance Framework Coverage",
    description:
      "Added six new compliance frameworks: NIST CSF 2.0, NIST SP 800-53 Rev 5, SOC 2, GDPR, SOCI Act, and PCI DSS 4.0. Added NIST SP 800-207 (Zero Trust Architecture) and ASD MDA Foundations. Audit Trail now maps GitHub activity to 63 controls across 10 frameworks. Rebranded to Audit Trail.",
  },
  {
    date: "2026-01-20",
    version: "1.0.0",
    type: "feature",
    title: "Initial Release",
    description:
      "Launch of Audit Trail with GitHub integration, compliance mapping for ISO 27001 and Essential Eight, and PDF/CSV export capabilities.",
  },
];

export default function ChangelogPage() {
  const typeColors = {
    feature: "bg-blue-100 text-blue-800",
    improvement: "bg-green-100 text-green-800",
    fix: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Changelog</h1>
          <p className="text-gray-600">Stay up to date with the latest features and improvements</p>
        </div>

        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${typeColors[entry.type]}`}
                    >
                      {entry.type}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{entry.version}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{entry.title}</h2>
                </div>
                <time className="text-sm text-gray-500">{entry.date}</time>
              </div>
              <p className="text-gray-600">{entry.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-accent hover:text-accent-hover font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
