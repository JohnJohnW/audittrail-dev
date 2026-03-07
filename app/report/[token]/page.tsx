import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getComplianceEvidence, getEvidenceSummary } from "@/lib/compliance";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Framework {
  framework: string;
  score: number;
  total: number;
  withEvidence: number;
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-md">
      <span className="text-4xl font-bold text-indigo-600">{score}%</span>
    </div>
  );
}

function FrameworkBar({ framework, score, withEvidence, total }: Framework) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{framework}</p>
        <p className="text-sm text-gray-500">
          {withEvidence} of {total} controls with evidence
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xl font-bold text-gray-800 w-12 text-right">{score}%</span>
      </div>
    </div>
  );
}

export default async function PublicReportPage({ params }: { params: { token: string } }) {
  const report = await db.shareableReport.findUnique({
    where: { token: params.token },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!report) notFound();
  if (report.expiresAt && report.expiresAt < new Date()) notFound();

  const evidence = await getComplianceEvidence(report.organization.id);
  const summary = getEvidenceSummary(evidence.controls);

  const byFramework: Framework[] = evidence.frameworks.map((f) => {
    const fc = evidence.controls.filter((c) => c.frameworkName === f.name);
    const fs = getEvidenceSummary(fc);
    return {
      framework: f.name,
      score: fs.score,
      total: fs.total,
      withEvidence: fs.withEvidence,
    };
  });

  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-md overflow-hidden">
            <Image src="/icon.svg" alt="Audit Trail" width={28} height={28} priority />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            Audit <span className="text-indigo-600">Trail</span>
          </span>
        </div>
        <span className="text-xs text-gray-400">Read-only report</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        {/* Title block */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{report.title}</h1>
          <p className="text-gray-500 text-sm">
            {report.organization.name} &middot; Generated {generatedAt}
          </p>
        </div>

        {/* Overall score */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 text-center">
          <ScoreRing score={summary.score} />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Overall Compliance Score</h2>
          <p className="text-sm text-gray-500 mt-1">
            Based on evidence coverage across {evidence.frameworks.length} framework
            {evidence.frameworks.length !== 1 ? "s" : ""}
          </p>

          {/* Summary counts */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "With Evidence", value: summary.withEvidence, color: "text-green-600" },
              {
                label: "Partial",
                value: summary.partial + summary.limited,
                color: "text-amber-600",
              },
              { label: "Missing", value: summary.noEvidence, color: "text-red-500" },
              { label: "Total Controls", value: summary.total, color: "text-gray-700" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Framework breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Framework Breakdown</h2>
          <div className="space-y-3">
            {byFramework.map((f) => (
              <FrameworkBar key={f.framework} {...f} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            This report was shared via{" "}
            <Link
              href="/"
              className="text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
            >
              Audit Trail
            </Link>
            . Content is read-only and reflects the state at the time of generation.
          </p>
        </div>
      </div>
    </div>
  );
}
