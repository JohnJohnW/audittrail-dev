"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EvidenceItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  url?: string;
}

interface ControlEvidence {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  evidenceType: string;
  status: "has_evidence" | "partial" | "no_evidence" | "limited";
  evidenceCount: number;
  evidence: EvidenceItem[];
  note?: string;
}

interface EvidenceData {
  frameworks: { id: string; name: string; controlCount: number }[];
  controls: ControlEvidence[];
  summary: {
    total: number;
    withEvidence: number;
    partial: number;
    limited: number;
    noEvidence: number;
    score: number;
  };
}

type StatusFilter = "all" | "has_evidence" | "partial" | "limited" | "no_evidence";

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedControl, setExpandedControl] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      const response = await fetch("/api/evidence");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch evidence:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading evidence...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load evidence data</p>
      </div>
    );
  }

  // Apply all filters
  const filteredControls = data.controls.filter((control) => {
    // Framework filter
    if (selectedFramework && control.frameworkName !== selectedFramework) {
      return false;
    }
    // Status filter
    if (selectedStatus !== "all" && control.status !== selectedStatus) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCode = control.controlCode.toLowerCase().includes(query);
      const matchesTitle = control.controlTitle.toLowerCase().includes(query);
      const matchesDescription = control.controlDescription?.toLowerCase().includes(query) || false;
      if (!matchesCode && !matchesTitle && !matchesDescription) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Evidence</h1>
          <p className="text-gray-600 mt-1">
            View how your GitHub activity maps to compliance controls
          </p>
        </div>
        <Link
          href="/exports"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Export Report
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-gray-900">{data.summary.score}%</p>
          <p className="text-sm text-gray-600">Evidence Coverage</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-green-600">{data.summary.withEvidence}</p>
          <p className="text-sm text-gray-600">Full Evidence</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-yellow-600">{data.summary.partial}</p>
          <p className="text-sm text-gray-600">Partial Evidence</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-blue-600">{data.summary.limited || 0}</p>
          <p className="text-sm text-gray-600">Limited (Needs Supplement)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-red-600">{data.summary.noEvidence}</p>
          <p className="text-sm text-gray-600">Missing Evidence</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-4">
        {/* Search Input */}
        <div>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search controls by code, title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Framework Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Framework:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFramework(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedFramework === null
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {data.frameworks.map((framework) => (
                <button
                  key={framework.id}
                  onClick={() => setSelectedFramework(framework.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedFramework === framework.name
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {framework.name}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All", color: "bg-gray-100 text-gray-600" },
                { value: "has_evidence", label: "Has Evidence", color: "bg-green-100 text-green-700" },
                { value: "partial", label: "Partial", color: "bg-yellow-100 text-yellow-700" },
                { value: "limited", label: "Limited", color: "bg-blue-100 text-blue-700" },
                { value: "no_evidence", label: "Missing", color: "bg-red-100 text-red-700" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value as StatusFilter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === status.value
                      ? status.color
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500">
          Showing {filteredControls.length} of {data.controls.length} controls
        </div>
      </div>

      {/* Controls List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredControls.map((control) => (
            <div key={control.controlId} className="p-4">
              <button
                onClick={() =>
                  setExpandedControl(
                    expandedControl === control.controlId ? null : control.controlId
                  )
                }
                className="w-full text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {control.controlCode}
                      </span>
                      <StatusBadge status={control.status} />
                    </div>
                    <h3 className="font-medium text-gray-900 mt-2">
                      {control.controlTitle}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {control.frameworkName} &bull; {control.evidenceCount} evidence items
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedControl === control.controlId ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {expandedControl === control.controlId && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {control.controlDescription && (
                    <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                      {control.controlDescription}
                    </p>
                  )}

                  {control.note && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Note:</span> {control.note}
                      </p>
                    </div>
                  )}

                  {control.evidence.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No evidence collected yet. Make sure you have synced your repositories.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Supporting Evidence:
                      </p>
                      {control.evidence.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.title}
                              </p>
                              <p className="text-gray-600 mt-1">
                                {item.description}
                              </p>
                            </div>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 ml-4 flex-shrink-0"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "has_evidence" | "partial" | "no_evidence" | "limited" }) {
  const styles = {
    has_evidence: "bg-green-50 text-green-700",
    partial: "bg-yellow-50 text-yellow-700",
    limited: "bg-blue-50 text-blue-700",
    no_evidence: "bg-red-50 text-red-700",
  };

  const labels = {
    has_evidence: "Has Evidence",
    partial: "Partial",
    limited: "Limited",
    no_evidence: "Missing",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
