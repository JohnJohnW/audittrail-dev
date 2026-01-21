"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

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

const statusBadgeVariant = {
  has_evidence: "success" as const,
  partial: "warning" as const,
  limited: "info" as const,
  no_evidence: "error" as const,
};

const statusLabels = {
  has_evidence: "Has Evidence",
  partial: "Partial",
  limited: "Limited",
  no_evidence: "Missing",
};

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

  const filteredControls = useMemo(() => {
    if (!data) return [];
    return data.controls.filter((control) => {
      if (selectedFramework && control.frameworkName !== selectedFramework) return false;
      if (selectedStatus !== "all" && control.status !== selectedStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = control.controlCode.toLowerCase().includes(query);
        const matchesTitle = control.controlTitle.toLowerCase().includes(query);
        const matchesDescription =
          control.controlDescription?.toLowerCase().includes(query) || false;
        if (!matchesCode && !matchesTitle && !matchesDescription) return false;
      }
      return true;
    });
  }, [data, selectedFramework, selectedStatus, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading evidence...</p>
        </div>
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

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Compliance Evidence
            </h1>
            <p className="text-gray-500 mt-1">
              View how your GitHub activity maps to compliance controls
            </p>
          </div>
          <Button variant="accent" href="/exports">
            Export Report
          </Button>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StaggerItem>
          <SummaryCard
            value={`${data.summary.score}%`}
            label="Evidence Coverage"
            variant="accent"
          />
        </StaggerItem>
        <StaggerItem>
          <SummaryCard value={data.summary.withEvidence} label="Full Evidence" variant="success" />
        </StaggerItem>
        <StaggerItem>
          <SummaryCard value={data.summary.partial} label="Partial Evidence" variant="warning" />
        </StaggerItem>
        <StaggerItem>
          <SummaryCard value={data.summary.limited || 0} label="Limited" variant="info" />
        </StaggerItem>
        <StaggerItem>
          <SummaryCard value={data.summary.noEvidence} label="Missing Evidence" variant="error" />
        </StaggerItem>
      </StaggerContainer>

      {/* Search and Filters */}
      <FadeIn delay={0.2}>
        <Card className="mb-6">
          <CardContent className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="Search controls by code, title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<SearchIcon />}
            />

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Framework Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Framework:</span>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={selectedFramework === null}
                    onClick={() => setSelectedFramework(null)}
                  >
                    All
                  </FilterButton>
                  {data.frameworks.map((framework) => (
                    <FilterButton
                      key={framework.id}
                      active={selectedFramework === framework.name}
                      onClick={() => setSelectedFramework(framework.name)}
                    >
                      {framework.name}
                    </FilterButton>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={selectedStatus === "all"}
                    onClick={() => setSelectedStatus("all")}
                  >
                    All
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "has_evidence"}
                    onClick={() => setSelectedStatus("has_evidence")}
                    variant="success"
                  >
                    Has Evidence
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "partial"}
                    onClick={() => setSelectedStatus("partial")}
                    variant="warning"
                  >
                    Partial
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "limited"}
                    onClick={() => setSelectedStatus("limited")}
                    variant="info"
                  >
                    Limited
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "no_evidence"}
                    onClick={() => setSelectedStatus("no_evidence")}
                    variant="error"
                  >
                    Missing
                  </FilterButton>
                </div>
              </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-gray-500">
              Showing {filteredControls.length} of {data.controls.length} controls
            </p>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Controls List */}
      <FadeIn delay={0.3}>
        <Card padding="none" variant="elevated">
          <div className="divide-y divide-gray-100">
            {filteredControls.map((control, index) => (
              <ControlItem
                key={control.controlId}
                control={control}
                isExpanded={expandedControl === control.controlId}
                onToggle={() =>
                  setExpandedControl(
                    expandedControl === control.controlId ? null : control.controlId
                  )
                }
                index={index}
              />
            ))}
            {filteredControls.length === 0 && (
              <div className="p-8 text-center text-gray-500">No controls match your filters</div>
            )}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

// Sub-components

function SummaryCard({
  value,
  label,
  variant,
}: {
  value: string | number;
  label: string;
  variant: "accent" | "success" | "warning" | "info" | "error";
}) {
  const colors = {
    accent: "text-accent",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
    error: "text-red-600",
  };

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
    >
      <p className={cn("text-3xl font-bold", colors[variant])}>{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </motion.div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "success" | "warning" | "info" | "error";
}) {
  const activeColors = {
    default: "bg-gray-900 text-white",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
        active
          ? variant
            ? activeColors[variant]
            : activeColors.default
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      {children}
    </motion.button>
  );
}

function ControlItem({
  control,
  isExpanded,
  onToggle,
  index,
}: {
  control: ControlEvidence;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="group"
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                {control.controlCode}
              </span>
              <Badge variant={statusBadgeVariant[control.status]}>
                {statusLabels[control.status]}
              </Badge>
            </div>
            <h3 className="font-medium text-gray-900 mt-2.5">{control.controlTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {control.frameworkName} • {control.evidenceCount} evidence items
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 mt-1"
          >
            <ChevronIcon className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/30">
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
                  <p className="text-sm font-medium text-gray-700">Supporting Evidence:</p>
                  {control.evidence.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-lg p-4 text-sm border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-gray-600 mt-1">{item.description}</p>
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-hover ml-4 flex-shrink-0 transition-colors"
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Icons
function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}
