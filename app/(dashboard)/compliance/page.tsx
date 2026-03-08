"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { chart, chartStyles, progress } from "@/lib/design-tokens";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";
import { ShareReportButton } from "@/components/compliance/ShareReportButton";
import type { RepositoryRef } from "@/types";

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  index?: number;
  name?: string;
  value?: number;
}

interface ComplianceScore {
  overall: number;
  overallSummary?: {
    total: number;
    withEvidence: number;
    partial: number;
    limited: number;
    noEvidence: number;
  };
  byFramework: { framework: string; score: number; total: number; withEvidence: number }[];
  byCategory: { category: string; score: number }[];
}

// Monochromatic accent palette for consistent, professional look
const PIE_COLORS = [chart.primary, chart.secondary, chart.tertiary];

interface BenchmarkEntry {
  framework: string;
  orgScore: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  percentile: number | null;
  sampleCount: number | null;
}

export default function CompliancePage() {
  const [score, setScore] = useState<ComplianceScore | null>(null);
  const [repositories, setRepositories] = useState<RepositoryRef[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkEntry[]>([]);
  const [auditorPatterns, setAuditorPatterns] = useState<{
    sessionCount: number;
    patterns: {
      controlCode: string;
      frameworkName: string;
      approved: number;
      needsMoreInfo: number;
      rejected: number;
      totalSignoffs: number;
      attentionScore: number;
    }[];
  } | null>(null);

  useEffect(() => {
    fetchData();
    // Fetch benchmarks (non-blocking, may have no data until flywheel has enough orgs)
    fetch("/api/benchmarks")
      .then((r) => r.json())
      .then((d: { benchmarks?: BenchmarkEntry[] }) => {
        if (Array.isArray(d.benchmarks)) setBenchmarks(d.benchmarks);
      })
      .catch(() => {
        /* benchmarks are optional */
      });

    // Fetch auditor patterns (non-blocking)
    fetch("/api/insights/auditor")
      .then((r) => r.json())
      .then((d: typeof auditorPatterns) => {
        if (d && Array.isArray(d.patterns)) setAuditorPatterns(d);
      })
      .catch(() => {
        /* auditor insights are optional */
      });
  }, []);

  useEffect(() => {
    // Only refetch score when selection changes (not on initial mount)
    // Initial data is already fetched in fetchData
    if (selectedRepositories.length > 0) {
      fetchScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepositories]);

  const fetchData = async () => {
    try {
      const [scoreRes, reposRes] = await Promise.all([
        fetch("/api/compliance/score"),
        fetch("/api/github/repositories"),
      ]);

      // Check if score API call was successful
      if (!scoreRes.ok) {
        const errorData = await scoreRes.json().catch(() => ({}));
        logger.error("Compliance score API error", undefined, { errorData });
        setError(errorData.error || "Failed to load compliance score");
        setScore(null);
        setRepositories([]);
        return;
      }

      // Check if repos API call was successful
      if (!reposRes.ok) {
        logger.error("Repositories API error", undefined, {
          status: reposRes.status,
          statusText: reposRes.statusText,
        });
        // Still try to parse score data even if repos fail
      }

      const scoreData = await scoreRes.json();
      const reposData = reposRes.ok
        ? await reposRes.json().catch(() => ({ repositories: [] }))
        : { repositories: [] };

      // Validate score data structure
      if (scoreData.error) {
        logger.error("Compliance score API returned error", undefined, { scoreData });
        setError(scoreData.error || "Invalid score data");
        setScore(null);
        setRepositories([]);
        return;
      }

      // Validate required fields
      if (typeof scoreData.overall !== "number" || !Array.isArray(scoreData.byFramework)) {
        logger.error("Invalid score data structure", undefined, { scoreData });
        setScore(null);
        setRepositories([]);
        return;
      }

      setScore(scoreData);

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
      setError(error instanceof Error ? error.message : "Failed to fetch compliance score");
      setScore(null);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScore = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRepositories.length > 0) {
        params.set("repositoryIds", selectedRepositories.join(","));
      }
      const response = await fetch(`/api/compliance/score?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error("Compliance score API error", undefined, { errorData });
        return;
      }

      const data = await response.json();

      // Validate data structure before setting
      if (data.error || typeof data.overall !== "number") {
        logger.error("Invalid score data", undefined, { data });
        return;
      }

      setScore(data);
    } catch (error) {
      logger.error("Failed to fetch compliance score", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase("compliance")}</p>
        </div>
      </div>
    );
  }

  if (!score || typeof score.overall !== "number" || !Array.isArray(score.byFramework)) {
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {error ? "Error Loading Compliance Score" : "No Compliance Data Available"}
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {error
            ? error
            : "Connect your GitHub repositories and sync them to start tracking compliance."}
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

  // Calculate pie chart data from overall summary if available, otherwise fallback to framework sum
  const pieData = score.overallSummary
    ? [
        {
          name: "With Evidence",
          value: score.overallSummary.withEvidence || 0,
        },
        {
          name: "Partial",
          value: (score.overallSummary.partial || 0) + (score.overallSummary.limited || 0),
        },
        {
          name: "Missing",
          value: score.overallSummary.noEvidence || 0,
        },
      ].filter((item) => item.value > 0) // Filter out zero values
    : [
        {
          name: "With Evidence",
          value: score.byFramework.reduce((sum, f) => sum + (f.withEvidence || 0), 0),
        },
        {
          name: "Missing",
          value: score.byFramework.reduce(
            (sum, f) => sum + ((f.total || 0) - (f.withEvidence || 0)),
            0
          ),
        },
      ].filter((item) => item.value > 0); // Filter out zero values

  const hasPieData = pieData.length > 0 && pieData.some((item) => item.value > 0);

  // True when frameworks are loaded and controls exist but no evidence has been found yet.
  // This happens when repos are connected but haven't been synced, so no commits/PRs are
  // in the database for the evidence engine to match against.
  const hasNoSyncData =
    score.byFramework.length > 0 &&
    score.byFramework.every((f) => f.withEvidence === 0) &&
    (score.overallSummary?.total ?? 0) > 0;

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Compliance Score
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Overall compliance status and framework breakdown
            </p>
          </div>
          <div className="shrink-0">
            <ShareReportButton />
          </div>
        </div>
      </FadeIn>

      {/* Repository Filter */}
      {repositories.length > 0 && (
        <FadeIn delay={0.05}>
          <Card variant="elevated" className="mb-6 sm:mb-8">
            <CardContent className="py-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Repository
              </label>
              <div className="flex flex-wrap gap-2">
                {repositories.map((repo) => (
                  <motion.button
                    key={repo.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRepositories((prev) =>
                        prev.includes(repo.id)
                          ? prev.filter((id) => id !== repo.id)
                          : [...prev, repo.id]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedRepositories.includes(repo.id)
                        ? "bg-accent text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {repo.fullName}
                  </motion.button>
                ))}
                {selectedRepositories.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRepositories([])}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    Clear All
                  </motion.button>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Overall Score */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-6 sm:mb-8">
          <CardContent className="py-6 sm:py-10">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-accent-light to-accent/10 mb-4 sm:mb-6 shadow-lg shadow-accent/10"
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl font-bold text-accent"
                >
                  {score.overall}%
                </motion.span>
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Overall Compliance Score</h2>
              <p className="text-gray-500">Based on evidence coverage across all frameworks</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {hasNoSyncData ? (
        <>
          {/* No-sync onboarding card */}
          <FadeIn delay={0.2}>
            <Card variant="elevated" className="mb-6 sm:mb-8">
              <CardContent className="py-8">
                <div className="max-w-lg mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">No evidence data yet</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Audit Trail maps GitHub activity to compliance controls — it needs to import
                        your repository data first.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 pl-1">
                    {/* Step 1 — frameworks */}
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg
                          className="w-3 h-3 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">
                          {score.byFramework.length} compliance frameworks
                        </span>{" "}
                        loaded and ready
                      </p>
                    </div>

                    {/* Step 2 — repositories */}
                    <div className="flex items-start gap-3">
                      {repositories.length > 0 ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                          <svg
                            className="w-3 h-3 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs text-gray-400 font-bold">2</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-700">
                        {repositories.length > 0 ? (
                          <>
                            <span className="font-medium">
                              {repositories.length}{" "}
                              {repositories.length === 1 ? "repository" : "repositories"}
                            </span>{" "}
                            connected
                          </>
                        ) : (
                          <span className="text-gray-500">Connect a GitHub repository first</span>
                        )}
                      </p>
                    </div>

                    {/* Step 3 — sync */}
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs text-amber-600 font-bold">
                          {repositories.length > 0 ? "3" : "2"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Sync your repositories</span> to import
                        commits, pull requests, and branch protection rules — evidence scores will
                        appear once the sync completes
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/repositories"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
                  >
                    Go to Repositories
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Framework list — still shown so user can see what will be measured */}
          <FadeIn delay={0.35}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Frameworks Being Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <StaggerContainer className="space-y-3">
                  {score.byFramework.map((framework) => (
                    <StaggerItem key={framework.framework}>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm font-medium text-gray-900">
                          {framework.framework}
                        </span>
                        <span className="text-xs text-gray-400">{framework.total} controls</span>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </CardContent>
            </Card>
          </FadeIn>
        </>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <FadeIn delay={0.2}>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>By Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={score.byFramework}>
                      <CartesianGrid {...chartStyles.grid} />
                      <XAxis dataKey="framework" tick={chartStyles.axis.tick} />
                      <YAxis tick={chartStyles.axis.tick} />
                      <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
                      <Bar dataKey="score" fill={chart.primary} radius={chartStyles.bar.radius} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.3}>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Evidence Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasPieData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={(props: PieLabelProps) => {
                            const { name, percent } = props;
                            // Only show label if segment is significant (>5%)
                            if (!percent || percent < 0.05) return "";
                            return `${name || ""}\n${(percent * 100).toFixed(0)}%`;
                          }}
                          outerRadius={100}
                          innerRadius={60}
                          fill={chart.primary}
                          dataKey="value"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={chartStyles.tooltip.contentStyle}
                          formatter={(value: unknown) => {
                            const numValue = typeof value === "number" ? value : 0;
                            return `${numValue} controls`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <p>No evidence data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Framework Details */}
          <FadeIn delay={0.4}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Framework Details</CardTitle>
              </CardHeader>
              <CardContent>
                <StaggerContainer className="space-y-4">
                  {score.byFramework.map((framework, index) => (
                    <StaggerItem key={framework.framework}>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100"
                      >
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {framework.framework}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5 sm:mt-1">
                            {framework.withEvidence} of {framework.total} controls with evidence
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 sm:text-right shrink-0">
                          <div className="flex-1 sm:flex-none sm:w-24 lg:w-36 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${framework.score}%` }}
                              transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                              className="h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  framework.score >= 70
                                    ? progress.high
                                    : framework.score >= 40
                                      ? progress.medium
                                      : progress.low,
                              }}
                            />
                          </div>
                          <div className="text-xl sm:text-2xl font-bold text-accent w-14 text-right">
                            {framework.score}%
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </CardContent>
            </Card>
          </FadeIn>
        </>
      )}

      {/* Auditor Patterns — controls flagged by auditors */}
      {auditorPatterns && auditorPatterns.patterns.length > 0 && (
        <FadeIn delay={0.55}>
          <Card variant="elevated" className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle>Auditor Attention Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Controls that auditors have most frequently flagged across{" "}
                {auditorPatterns.sessionCount} session
                {auditorPatterns.sessionCount !== 1 ? "s" : ""}.
              </p>
              <div className="space-y-3">
                {auditorPatterns.patterns.map((p) => (
                  <div
                    key={`${p.controlCode}-${p.frameworkName}`}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                          {p.controlCode}
                        </span>
                        <span className="text-xs text-gray-500">{p.frameworkName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.rejected > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          {p.rejected} rejected
                        </span>
                      )}
                      {p.needsMoreInfo > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {p.needsMoreInfo} needs info
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Industry Benchmarks — "How you compare" */}
      {benchmarks.some((b) => b.percentile !== null) && (
        <FadeIn delay={0.6}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>How You Compare</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-5">
                Your compliance score vs. companies with a similar profile.
              </p>
              <div className="space-y-5">
                {benchmarks
                  .filter((b) => b.p25 !== null && b.percentile !== null)
                  .map((b) => (
                    <div key={b.framework}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{b.framework}</span>
                        <span className="text-sm text-gray-500">
                          {b.percentile !== null ? `${Math.round(b.percentile)}th percentile` : ""}
                          {b.sampleCount ? ` · ${b.sampleCount} similar companies` : ""}
                        </span>
                      </div>
                      {/* Bar chart showing p25/p50/p75/orgScore */}
                      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                        {/* p25–p75 band */}
                        {b.p25 !== null && b.p75 !== null && (
                          <div
                            className="absolute top-0 h-full bg-blue-100 rounded"
                            style={{
                              left: `${b.p25}%`,
                              width: `${Math.max(0, (b.p75 ?? 0) - (b.p25 ?? 0))}%`,
                            }}
                          />
                        )}
                        {/* Median marker */}
                        {b.p50 !== null && (
                          <div
                            className="absolute top-1 h-6 w-0.5 bg-blue-400 rounded"
                            style={{ left: `${b.p50}%` }}
                            title={`Median: ${b.p50}%`}
                          />
                        )}
                        {/* Org score marker */}
                        <div
                          className="absolute top-1 h-6 w-1 bg-accent rounded"
                          style={{ left: `${Math.min(b.orgScore, 99)}%` }}
                          title={`Your score: ${b.orgScore}%`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0%</span>
                        <span className="text-accent font-medium">You: {b.orgScore}%</span>
                        {b.p50 !== null && <span>Median: {b.p50}%</span>}
                        <span>100%</span>
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Benchmarks are derived from anonymised, aggregated data across similar
                organisations. Individual org data is never shared.
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
