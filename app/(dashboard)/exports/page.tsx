"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExportRecord {
  id: string;
  type: string;
  fileName: string;
  status: string;
  createdAt: string;
}

interface Framework {
  id: string;
  name: string;
  controlCount: number;
}

interface Repository {
  id: string;
  fullName: string;
}

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [canExport, setCanExport] = useState(false);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<string>("");
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [exportsRes, evidenceRes, reposRes] = await Promise.all([
        fetch("/api/exports"),
        fetch("/api/evidence"),
        fetch("/api/github/repositories"),
      ]);

      const exportsData = await exportsRes.json();
      const evidenceData = await evidenceRes.json();
      const reposData = await reposRes.json();

      setExports(exportsData.exports || []);
      setCanExport(exportsData.canExport);
      setFrameworks(evidenceData.frameworks || []);
      setRepositories(
        (reposData.tracked || []).map((r: { id: string; full_name: string }) => ({
          id: r.id,
          fullName: r.full_name,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRepository = (repoId: string) => {
    setSelectedRepositories((prev) =>
      prev.includes(repoId)
        ? prev.filter((id) => id !== repoId)
        : [...prev, repoId]
    );
  };

  const handleExport = async () => {
    if (!canExport) return;

    setExporting(true);
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          frameworkId: selectedFramework || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          repositoryIds: selectedRepositories.length > 0 ? selectedRepositories : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.requiresUpgrade) {
          alert("Please upgrade to Pro to export reports.");
        } else {
          alert(error.error || "Export failed");
        }
        return;
      }

      // Download the file
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || `export.${exportFormat}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Refresh exports list
      await fetchData();
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
        <p className="text-gray-600 mt-1">
          Generate audit-ready PDF reports or CSV exports
        </p>
      </div>

      {/* Export Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Create New Export
        </h2>

        {!canExport && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-600 mr-3 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">
                  Upgrade required for exports
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  PDF and CSV exports are available on the Pro plan.
                </p>
                <Link
                  href="/settings"
                  className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  Upgrade to Pro &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Row 1: Framework, Format, Export Button */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Framework
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                disabled={!canExport}
              >
                <option value="">All Frameworks</option>
                {frameworks.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name} ({fw.controlCount} controls)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex space-x-4 pt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={exportFormat === "pdf"}
                    onChange={() => setExportFormat("pdf")}
                    disabled={!canExport}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-gray-700">PDF</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={() => setExportFormat("csv")}
                    disabled={!canExport}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-gray-700">CSV</span>
                </label>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={!canExport || exporting}
                className="w-full bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? "Generating..." : "Generate Export"}
              </button>
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date (optional)
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                disabled={!canExport}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date (optional)
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                disabled={!canExport}
              />
            </div>
          </div>

          {/* Row 3: Repository Filter */}
          {repositories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repositories (optional - leave empty for all)
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
                {repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => toggleRepository(repo.id)}
                    disabled={!canExport}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedRepositories.includes(repo.id)
                        ? "bg-primary-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:border-primary-500"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {repo.fullName}
                  </button>
                ))}
              </div>
              {selectedRepositories.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedRepositories.length} repository(s) selected
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
        </div>

        {exports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No exports yet. Generate your first report above.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exports.map((exp) => (
              <div
                key={exp.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                      exp.type === "pdf" ? "bg-red-50" : "bg-green-50"
                    }`}
                  >
                    {exp.type === "pdf" ? (
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{exp.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(exp.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    exp.status === "completed"
                      ? "bg-green-50 text-green-700"
                      : exp.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {exp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
