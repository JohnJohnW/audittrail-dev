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
  status: "has_evidence" | "partial" | "no_evidence";
  evidenceCount: number;
  evidence: EvidenceItem[];
}

interface EvidenceData {
  frameworks: { id: string; name: string; controlCount: number }[];
  controls: ControlEvidence[];
  summary: {
    total: number;
    withEvidence: number;
    partial: number;
    noEvidence: number;
    score: number;
  };
}

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
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

  const filteredControls = selectedFramework
    ? data.controls.filter((c) => c.frameworkName === selectedFramework)
    : data.controls;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-gray-900">{data.summary.score}%</p>
          <p className="text-sm text-gray-600">Evidence Coverage</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-green-600">{data.summary.withEvidence}</p>
          <p className="text-sm text-gray-600">Controls with Evidence</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-yellow-600">{data.summary.partial}</p>
          <p className="text-sm text-gray-600">Partial Evidence</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-red-600">{data.summary.noEvidence}</p>
          <p className="text-sm text-gray-600">Missing Evidence</p>
        </div>
      </div>

      {/* Framework Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <span className="text-sm font-medium text-gray-700">Filter by framework:</span>
        <div className="flex space-x-2">
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
              {framework.name} ({framework.controlCount})
            </button>
          ))}
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
                    <p className="text-sm text-gray-600 mb-4">
                      {control.controlDescription}
                    </p>
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

function StatusBadge({ status }: { status: "has_evidence" | "partial" | "no_evidence" }) {
  const styles = {
    has_evidence: "bg-green-50 text-green-700",
    partial: "bg-yellow-50 text-yellow-700",
    no_evidence: "bg-red-50 text-red-700",
  };

  const labels = {
    has_evidence: "Has Evidence",
    partial: "Partial",
    no_evidence: "Missing",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
