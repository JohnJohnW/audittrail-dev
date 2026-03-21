"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";
import { getGapRecommendation, getGapPriority } from "@/lib/gap-analysis";
import type { ComplianceControl } from "@/types";

// Local alias to keep existing code readable; matches ComplianceControl from @/types
type ControlEvidence = ComplianceControl;

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

interface Repository {
  id: string;
  fullName: string;
}

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  // Loading phrase set client-side only to avoid SSR/hydration mismatch from Math.random()
  const [loadingPhrase, setLoadingPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [canExport, setCanExport] = useState<boolean | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);

  useEffect(() => {
    setLoadingPhrase(getContextualLoadingPhrase("evidence"));
    fetchData();
    // Check dismiss state from localStorage
    const dismissed = localStorage.getItem("evidence_upgrade_dismissed");
    if (dismissed === "true") setUpgradeDismissed(true);
    // Fetch canExport to determine Pro status
    fetch("/api/exports")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.canExport === "boolean") {
          setCanExport(data.canExport);
        }
      })
      .catch(() => {
        // Non-critical — silently ignore
      });
  }, []);

  const fetchData = async () => {
    try {
      const [evidenceRes, reposRes] = await Promise.all([
        fetch("/api/evidence"),
        fetch("/api/github/repositories"),
      ]);

      // Check if evidence API call was successful
      if (!evidenceRes.ok) {
        const errorData = await evidenceRes.json().catch(() => ({}));
        logger.error("Evidence API error", undefined, { errorData });
        setError(errorData.error || "Failed to load evidence data");
        setData(null);
        setRepositories([]);
        return;
      }

      // Check if repos API call was successful
      if (!reposRes.ok) {
        logger.error("Repositories API error", undefined, {
          status: reposRes.status,
          statusText: reposRes.statusText,
        });
        // Still try to parse evidence data even if repos fail
      }

      const evidenceData = await evidenceRes.json();
      const reposData = reposRes.ok
        ? await reposRes.json().catch(() => ({ repositories: [] }))
        : { repositories: [] };

      // Validate evidence data structure
      if (evidenceData.error) {
        logger.error("Evidence API returned error", undefined, { evidenceData });
        setError(evidenceData.error || "Invalid evidence data");
        setData(null);
        setRepositories([]);
        return;
      }

      // Ensure controls is an array (default to empty if missing)
      if (!Array.isArray(evidenceData.controls)) {
        logger.error("Invalid evidence data structure - controls is not an array", undefined, {
          evidenceData,
        });
        setData(null);
        setRepositories([]);
        return;
      }

      setData(evidenceData);

      // Extract tracked repositories from the API response
      // The API returns { connected: boolean, repositories: [...] }
      // We only want active/tracked repositories with database IDs
      if (reposData.repositories && Array.isArray(reposData.repositories)) {
        const trackedRepos = reposData.repositories
          .filter((r: { isActive: boolean; dbId?: string }) => r.isActive && r.dbId)
          .map((r: { dbId: string; fullName: string }) => ({
            id: r.dbId, // Use database ID for filtering
            fullName: r.fullName,
          }));
        setRepositories(trackedRepos);
      } else {
        setRepositories([]);
      }
      setError(null); // Clear error on success
    } catch (error) {
      logger.error("Failed to fetch data", error);
      setError(error instanceof Error ? error.message : "Failed to fetch evidence data");
      setData(null);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRepositories.length > 0) {
        params.set("repositoryIds", selectedRepositories.join(","));
      }
      const response = await fetch(`/api/evidence?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error("Evidence API error", undefined, { errorData });
        return;
      }

      const result = await response.json();

      // Validate data structure before setting
      if (result.error || !result.controls) {
        logger.error("Invalid evidence data", undefined, { result });
        return;
      }

      setData(result);
    } catch (error) {
      logger.error("Failed to fetch evidence", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only refetch evidence when selection changes (not on initial mount)
    // Initial data is already fetched in fetchData
    if (selectedRepositories.length > 0) {
      fetchEvidence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepositories]);

  const toggleRepository = (repoId: string) => {
    setSelectedRepositories((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const filteredControls = useMemo((): ControlEvidence[] => {
    if (!data || !Array.isArray(data.controls)) return [];
    const controls = data.controls as ControlEvidence[];
    const filtered = controls.filter((control) => {
      if (selectedFramework && control.frameworkName !== selectedFramework) return false;
      if (selectedStatus !== "all" && control.status !== selectedStatus) return false;
      // Note: Repository filtering is done server-side via API, but we also filter client-side
      // for evidence items that might span multiple repositories
      if (selectedRepositories.length > 0) {
        // Filter by repository - check if any evidence item matches selected repositories
        const hasMatchingRepo = control.evidence.some(
          (item) => item.repositoryId && selectedRepositories.includes(item.repositoryId)
        );
        if (!hasMatchingRepo) return false;
      }
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

    if (sortByPriority) {
      const total = controls.length;
      filtered.sort((a: ControlEvidence, b: ControlEvidence) => {
        if (a.status === "has_evidence" || a.status === "limited") return 1;
        if (b.status === "has_evidence" || b.status === "limited") return -1;
        const pa = getGapPriority(a.evidenceType, a.status as "partial" | "no_evidence", total);
        const pb = getGapPriority(b.evidenceType, b.status as "partial" | "no_evidence", total);
        return pb.scoreImpact - pa.scoreImpact;
      });
    }

    return filtered;
  }, [data, selectedFramework, selectedStatus, selectedRepositories, searchQuery, sortByPriority]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{loadingPhrase || "Loading evidence…"}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {error ? "Error Loading Evidence" : "No Evidence Data Available"}
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {error
            ? error
            : "Connect your GitHub repositories and sync them to start collecting compliance evidence."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            Retry
          </button>
          <Link
            href="/repositories"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Go to Repositories
          </Link>
        </div>
      </div>
    );
  }

  // Ensure data has required structure, with defaults
  const controls = Array.isArray(data.controls) ? data.controls : [];
  const frameworks = Array.isArray(data.frameworks) ? data.frameworks : [];
  const _summary = data.summary || {
    total: 0,
    withEvidence: 0,
    partial: 0,
    limited: 0,
    noEvidence: 0,
    score: 0,
  };

  const handleDismissUpgrade = () => {
    setUpgradeDismissed(true);
    localStorage.setItem("evidence_upgrade_dismissed", "true");
  };

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Compliance Evidence
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              View how your GitHub activity maps to compliance controls
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" href="/evidence/upload" className="flex-1 sm:flex-none">
              Upload Evidence
            </Button>
            <Button variant="accent" href="/exports" className="flex-1 sm:flex-none">
              Export Report
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Upgrade banner — only for non-Pro users, dismissible */}
      <AnimatePresence>
        {canExport === false && !upgradeDismissed && (
          <motion.div
            key="upgrade-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4 sticky top-0 z-10"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  Unlock all 12 frameworks, PDF exports, and the GRC dashboard
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  You&apos;re on the free plan — upgrade to Pro to access NIST AI RMF, EU AI Act,
                  SOCI Act, and more.
                </p>
                <Link
                  href="/settings"
                  className="inline-block mt-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2 transition-colors"
                >
                  Upgrade to Pro →
                </Link>
              </div>
            </div>
            <button
              onClick={handleDismissUpgrade}
              className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0 mt-0.5"
              aria-label="Dismiss upgrade banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards - All using accent color for consistency */}
      <FadeIn delay={0.1}>
        <StatCardGrid columns={{ default: 2, sm: 3, lg: 5 }} className="mb-6 sm:mb-8">
          <StatCard value={`${data.summary.score}%`} label="Evidence Coverage" highlight />
          <StatCard value={data.summary.withEvidence} label="Full Evidence" />
          <StatCard value={data.summary.partial} label="Partial Evidence" />
          <StatCard value={data.summary.limited || 0} label="Limited" />
          <StatCard value={data.summary.noEvidence} label="Missing Evidence" />
        </StatCardGrid>
      </FadeIn>

      {/* Search and Filters */}
      <FadeIn delay={0.2}>
        <Card className="mb-6">
          {/* Repository Filter */}
          {repositories.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Repository
              </label>
              <div className="flex flex-wrap gap-2">
                {repositories.map((repo) => (
                  <FilterButton
                    key={repo.id}
                    active={selectedRepositories.includes(repo.id)}
                    onClick={() => toggleRepository(repo.id)}
                  >
                    {repo.fullName}
                  </FilterButton>
                ))}
                {selectedRepositories.length > 0 && (
                  <FilterButton active={false} onClick={() => setSelectedRepositories([])}>
                    Clear All
                  </FilterButton>
                )}
              </div>
            </div>
          )}
          <CardContent className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="Search controls by code, title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<SearchIcon />}
            />

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6">
              {/* Framework Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-gray-700 shrink-0">Framework:</span>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={selectedFramework === null}
                    onClick={() => setSelectedFramework(null)}
                  >
                    All
                  </FilterButton>
                  {frameworks.map((framework) => (
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-gray-700 shrink-0">Status:</span>
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
                  >
                    Has Evidence
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "partial"}
                    onClick={() => setSelectedStatus("partial")}
                  >
                    Partial
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "limited"}
                    onClick={() => setSelectedStatus("limited")}
                  >
                    Limited
                  </FilterButton>
                  <FilterButton
                    active={selectedStatus === "no_evidence"}
                    onClick={() => setSelectedStatus("no_evidence")}
                  >
                    Missing
                  </FilterButton>
                </div>
              </div>
            </div>

            {/* Results count + priority sort */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredControls.length} of {controls.length} controls
              </p>
              <button
                onClick={() => setSortByPriority((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                  sortByPriority
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
                )}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Fix This First
              </button>
            </div>
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
                totalControls={controls.length}
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

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
        active ? "bg-accent text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      {children}
    </motion.button>
  );
}

/** Stable, ephemeral-safe identity for one evidence item used as the feedback key. */
function makeEvidenceHash(item: { type: string; title: string; repositoryId?: string }): string {
  return `${item.type}|${item.title.slice(0, 50)}|${item.repositoryId ?? ""}`;
}

function ControlItem({
  control,
  totalControls,
  isExpanded,
  onToggle,
  index,
}: {
  control: ControlEvidence;
  totalControls: number;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [exception, setException] = useState<{ reason: string; expiresAt: string | null } | null>(
    null
  );
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionExpiry, setExceptionExpiry] = useState("");
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [controlBenchmark, setControlBenchmark] = useState<{
    passRate: number;
    p50: number;
    sampleCount: number;
    orgPasses: boolean;
  } | null>(null);

  // Fetch note + exception when expanded for the first time
  useEffect(() => {
    if (!isExpanded) return;
    const encoded = encodeURIComponent(control.controlCode);
    const fw = encodeURIComponent(control.frameworkName);
    Promise.all([
      fetch(`/api/controls/${encoded}/notes?framework=${fw}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/controls/${encoded}/exceptions?framework=${fw}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/controls/${encoded}/evidence-feedback?framework=${fw}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/benchmarks/controls?framework=${fw}&controlCode=${encoded}`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([noteData, excData, feedbackData, benchmarkData]) => {
      if (noteData?.note?.content) setNoteContent(noteData.note.content);
      if (excData?.isActive && excData.exception) {
        setException({ reason: excData.exception.reason, expiresAt: excData.exception.expiresAt });
      }
      if (feedbackData?.ratings) setRatings(feedbackData.ratings as Record<string, string>);
      if (benchmarkData?.benchmark)
        setControlBenchmark(benchmarkData.benchmark as typeof controlBenchmark);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const saveNote = async () => {
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    try {
      await fetch(`/api/controls/${encodeURIComponent(control.controlCode)}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent, frameworkName: control.frameworkName }),
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setNoteSaving(false);
    }
  };

  const saveException = async () => {
    if (!exceptionReason.trim()) return;
    setExceptionSaving(true);
    try {
      await fetch(`/api/controls/${encodeURIComponent(control.controlCode)}/exceptions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: exceptionReason,
          frameworkName: control.frameworkName,
          expiresAt: exceptionExpiry || null,
        }),
      });
      setException({ reason: exceptionReason, expiresAt: exceptionExpiry || null });
      setShowExceptionForm(false);
    } finally {
      setExceptionSaving(false);
    }
  };

  const removeException = async () => {
    await fetch(
      `/api/controls/${encodeURIComponent(control.controlCode)}/exceptions?framework=${encodeURIComponent(control.frameworkName)}`,
      { method: "DELETE" }
    );
    setException(null);
  };

  const submitFeedback = async (hash: string, rating: "positive" | "negative") => {
    // Toggle off if same rating clicked again
    const newRating: "positive" | "negative" | null = ratings[hash] === rating ? null : rating;
    setRatings((prev) => {
      const next = { ...prev };
      if (newRating === null) delete next[hash];
      else next[hash] = newRating;
      return next;
    });
    setRatingLoading(hash);
    try {
      await fetch(`/api/controls/${encodeURIComponent(control.controlCode)}/evidence-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkName: control.frameworkName,
          evidenceHash: hash,
          rating: newRating,
        }),
      });
    } finally {
      setRatingLoading(null);
    }
  };

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
              {control.confidenceTier && (
                <span
                  title={`AI confidence: ${control.mappingConfidence !== undefined ? Math.round(control.mappingConfidence * 100) + "%" : control.confidenceTier}`}
                  className={`hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${
                    control.confidenceTier === "high"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : control.confidenceTier === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  AI {control.confidenceTier}
                </span>
              )}
              {(control.status === "no_evidence" || control.status === "partial") &&
                (() => {
                  const p = getGapPriority(
                    control.evidenceType,
                    control.status as "partial" | "no_evidence",
                    totalControls
                  );
                  const effortLabel =
                    p.effort === "low"
                      ? "Quick win"
                      : p.effort === "medium"
                        ? `~${p.daysToFix}d`
                        : "Complex";
                  const effortColor =
                    p.effort === "low"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : p.effort === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200";
                  return (
                    <span
                      title={`Fix this to gain +${p.scoreImpact.toFixed(1)} pts`}
                      className={`hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${effortColor}`}
                    >
                      {effortLabel} · +{p.scoreImpact.toFixed(1)} pts
                    </span>
                  );
                })()}
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
              {/* Industry benchmark chip */}
              {controlBenchmark && (
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                      controlBenchmark.orgPasses
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    )}
                    title={`Based on ${controlBenchmark.sampleCount} similar organisations`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {Math.round(controlBenchmark.passRate * 100)}% of peers pass this control
                    {controlBenchmark.orgPasses && (
                      <span className="text-emerald-500">· You pass</span>
                    )}
                  </span>
                </div>
              )}

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

              {(control.status === "partial" || control.status === "limited") && (
                <div className="mb-4">
                  <GapAnalysisPanel control={control} />
                </div>
              )}

              {control.evidence.length === 0 ? (
                control.status === "no_evidence" ? (
                  <GapAnalysisPanel control={control} />
                ) : null
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
                      {(() => {
                        const hash = makeEvidenceHash(item);
                        const myRating = ratings[hash];
                        const isLoading = ratingLoading === hash;
                        return (
                          <>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{item.title}</p>
                                <p className="text-gray-600 mt-1">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                                {/* Thumbs feedback */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void submitFeedback(hash, "positive");
                                  }}
                                  disabled={isLoading}
                                  title="Relevant evidence"
                                  className={cn(
                                    "p-1 rounded transition-colors",
                                    myRating === "positive"
                                      ? "text-emerald-600"
                                      : "text-gray-300 hover:text-emerald-500"
                                  )}
                                >
                                  <ThumbUpIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void submitFeedback(hash, "negative");
                                  }}
                                  disabled={isLoading}
                                  title="Not relevant"
                                  className={cn(
                                    "p-1 rounded transition-colors",
                                    myRating === "negative"
                                      ? "text-red-500"
                                      : "text-gray-300 hover:text-red-400"
                                  )}
                                >
                                  <ThumbDownIcon className="w-3.5 h-3.5" />
                                </button>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:text-accent-hover ml-1 transition-colors"
                                  >
                                    <ExternalLinkIcon className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {new Date(item.timestamp).toLocaleString()}
                              </p>
                              {item.repositoryFullName && (
                                <Badge variant="info" className="text-xs">
                                  {item.repositoryFullName}
                                </Badge>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  ))}
                </div>
              )}
              {/* ── Lock-in: Team Notes + Exception ────────────────── */}
              <div className="mt-5 pt-4 border-t border-gray-200 space-y-4">
                {/* Exception banner */}
                {exception && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-0.5">
                        Exception: Not Applicable
                      </p>
                      <p className="text-sm text-purple-800">{exception.reason}</p>
                      {exception.expiresAt && (
                        <p className="text-xs text-purple-500 mt-1">
                          Expires {new Date(exception.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={removeException}
                      className="text-xs text-purple-400 hover:text-purple-600 shrink-0 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Team note editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Team Notes
                    </label>
                    {noteSaved && <span className="text-xs text-green-600 font-medium">Saved</span>}
                  </div>
                  <textarea
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      setNoteSaved(false);
                    }}
                    onBlur={saveNote}
                    placeholder="Add context about how your team satisfies this control…"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">
                      Notes accumulate over time and are private to your team
                    </p>
                    <button
                      onClick={saveNote}
                      disabled={noteSaving || !noteContent.trim()}
                      className="text-xs text-accent hover:text-accent-hover font-medium disabled:opacity-40 transition-colors"
                    >
                      {noteSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                {/* Exception form toggle */}
                {!exception && !showExceptionForm && (
                  <button
                    onClick={() => setShowExceptionForm(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    + Mark as not applicable (exception)
                  </button>
                )}

                {showExceptionForm && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">
                      Why doesn&apos;t this control apply?
                    </p>
                    <textarea
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                      placeholder="e.g. We use a managed service that handles this control…"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 block mb-0.5">
                          Expiry (optional)
                        </label>
                        <input
                          type="date"
                          value={exceptionExpiry}
                          onChange={(e) => setExceptionExpiry(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={() => setShowExceptionForm(false)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveException}
                          disabled={exceptionSaving || !exceptionReason.trim()}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 disabled:opacity-40 transition-colors"
                        >
                          {exceptionSaving ? "Saving…" : "Save Exception"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GapAnalysisPanel({ control }: { control: ControlEvidence }) {
  const rec = getGapRecommendation(
    control.controlCode,
    control.frameworkName,
    control.evidenceType,
    control.status
  );

  if (!rec) {
    return (
      <p className="text-sm text-gray-500 italic">
        No evidence collected yet. Sync your repositories to generate evidence.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <svg
            className="w-4 h-4 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-800 mb-2">{rec.summary}</p>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
            How to generate evidence:
          </p>
          <ol className="space-y-1">
            {rec.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
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

function ThumbUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  );
}

function ThumbDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
    </svg>
  );
}
