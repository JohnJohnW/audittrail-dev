"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

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
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const handleExport = async () => {
    if (!canExport) return;

    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (fromDate > toDate) {
        alert("From date must be before To date");
        return;
      }
    }

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

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileName =
        contentDisposition?.match(/filename="(.+)"/)?.[1] || `export.${exportFormat}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Export Reports</h1>
          <p className="text-gray-500 mt-1">Generate audit-ready PDF reports or CSV exports</p>
        </div>
      </FadeIn>

      {/* Export Form */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle>Create New Export</CardTitle>
          </CardHeader>
          <CardContent>
            {!canExport && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <WarningIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">Upgrade required for exports</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      PDF and CSV exports are available on the Pro plan.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 transition-colors"
                    >
                      Upgrade to Pro →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              {/* Row 1: Framework, Format, Export Button */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Framework</label>
                  <select
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value)}
                    disabled={!canExport}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="flex gap-3 pt-1">
                    <FormatOption
                      value="pdf"
                      selected={exportFormat === "pdf"}
                      onChange={() => setExportFormat("pdf")}
                      disabled={!canExport}
                      icon={<PDFIcon />}
                    />
                    <FormatOption
                      value="csv"
                      selected={exportFormat === "csv"}
                      onChange={() => setExportFormat("csv")}
                      disabled={!canExport}
                      icon={<CSVIcon />}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="accent"
                    onClick={handleExport}
                    disabled={!canExport || exporting}
                    loading={exporting}
                    className="w-full"
                  >
                    {exporting ? "Generating..." : "Generate Export"}
                  </Button>
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
                    disabled={!canExport}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={!canExport}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 3: Repository Filter */}
              {repositories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repositories (optional - leave empty for all)
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 border border-gray-200 rounded-xl bg-gray-50/50 max-h-36 overflow-y-auto">
                    {repositories.map((repo) => (
                      <motion.button
                        key={repo.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleRepository(repo.id)}
                        disabled={!canExport}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-full transition-all font-medium",
                          selectedRepositories.includes(repo.id)
                            ? "bg-accent text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-700 hover:border-accent hover:text-accent",
                          !canExport && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {repo.fullName}
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {selectedRepositories.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-gray-500 mt-2"
                      >
                        {selectedRepositories.length} repository(s) selected
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Export History */}
      <FadeIn delay={0.2}>
        <Card padding="none" variant="elevated">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Export History</h2>
          </div>

          {exports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ExportIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500">No exports yet. Generate your first report above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {exports.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
                  className="px-6 py-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center mr-4 shadow-sm",
                        exp.type === "pdf"
                          ? "bg-gradient-to-br from-red-50 to-red-100"
                          : "bg-gradient-to-br from-green-50 to-green-100"
                      )}
                    >
                      {exp.type === "pdf" ? (
                        <PDFIcon className="w-5 h-5 text-red-600" />
                      ) : (
                        <CSVIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{exp.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(exp.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      exp.status === "completed"
                        ? "success"
                        : exp.status === "failed"
                          ? "error"
                          : "warning"
                    }
                  >
                    {exp.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}

// Sub-components

function FormatOption({
  value,
  selected,
  onChange,
  disabled,
  icon,
}: {
  value: string;
  selected: boolean;
  onChange: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium text-sm",
        selected
          ? "border-accent bg-accent-light/50 text-accent"
          : "border-gray-200 text-gray-600 hover:border-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
      {value.toUpperCase()}
    </motion.button>
  );
}

// Icons
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function CSVIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
