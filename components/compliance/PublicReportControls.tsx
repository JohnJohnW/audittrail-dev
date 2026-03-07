"use client";

import { useState } from "react";
import type { EvidenceStatus } from "@/types/compliance";

interface Control {
  controlCode: string;
  controlTitle: string;
  frameworkName: string;
  status: EvidenceStatus;
}

interface Framework {
  name: string;
}

interface Props {
  frameworks: Framework[];
  controls: Control[];
}

const STATUS_CONFIG: Record<EvidenceStatus, { label: string; className: string; dot: string }> = {
  has_evidence: {
    label: "Covered",
    className: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  limited: {
    label: "Limited",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  no_evidence: {
    label: "Missing",
    className: "bg-red-50 text-red-600 border border-red-200",
    dot: "bg-red-400",
  },
};

function StatusBadge({ status }: { status: EvidenceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type FilterValue = "all" | "covered" | "partial" | "missing";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "covered", label: "Covered" },
  { value: "partial", label: "Partial" },
  { value: "missing", label: "Missing" },
];

function matchesFilter(status: EvidenceStatus, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "covered") return status === "has_evidence";
  if (filter === "partial") return status === "partial" || status === "limited";
  if (filter === "missing") return status === "no_evidence";
  return true;
}

export function PublicReportControls({ frameworks, controls }: Props) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredControls = controls.filter((c) => matchesFilter(c.status, filter));

  const counts: Record<FilterValue, number> = {
    all: controls.length,
    covered: controls.filter((c) => c.status === "has_evidence").length,
    partial: controls.filter((c) => c.status === "partial" || c.status === "limited").length,
    missing: controls.filter((c) => c.status === "no_evidence").length,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Control Details</h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              <span
                className={`inline-flex items-center justify-center rounded-full text-xs min-w-[1rem] h-4 px-1 ${
                  filter === f.value ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {frameworks.map((f) => {
          const frameworkFiltered = filteredControls.filter((c) => c.frameworkName === f.name);
          if (frameworkFiltered.length === 0) return null;

          const totalForFramework = controls.filter((c) => c.frameworkName === f.name).length;
          const coveredCount = controls.filter(
            (c) => c.frameworkName === f.name && c.status === "has_evidence"
          ).length;

          return (
            <details
              // Remount on filter change so accordions open automatically when filtering
              key={`${f.name}-${filter}`}
              className="group rounded-xl border border-gray-100 overflow-hidden"
              open={filter !== "all"}
            >
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 hover:bg-gray-50 select-none list-none [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-gray-900 text-sm">{f.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {filter === "all"
                      ? `${coveredCount}/${totalForFramework} covered`
                      : `${frameworkFiltered.length} shown · ${coveredCount}/${totalForFramework} covered`}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
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
              </summary>
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {frameworkFiltered.map((c) => (
                  <div
                    key={c.controlCode}
                    className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-mono text-xs text-gray-400 shrink-0">
                        {c.controlCode}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{c.controlTitle}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </details>
          );
        })}

        {filteredControls.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No controls match this filter.</p>
        )}
      </div>
    </div>
  );
}
