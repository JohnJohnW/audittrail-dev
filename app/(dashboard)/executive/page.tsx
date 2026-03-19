"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { progress } from "@/lib/design-tokens";

// ---- Types ----

interface Posture {
  score: number;
  total: number;
  withEvidence: number;
  partial: number;
  noEvidence: number;
  lastUpdated: string;
}

interface BusinessImpact {
  breachExposure: number;
  fineExposure: number;
  dealBlockerRisk: "High" | "Medium" | "Low" | "Minimal";
  daysToAuditReady: number;
  reputationScore: number;
  gapCount: number;
  totalControls: number;
  coveredControls: number;
}

interface FrameworkRow {
  name: string;
  score: number;
  total: number;
  withEvidence: number;
  gaps: number;
}

interface GapItem {
  code: string;
  name: string;
  framework: string;
  severity: "partial" | "missing";
}

interface Repository {
  name: string;
  lastSync: string | null;
}

interface SummaryData {
  posture: Posture;
  businessImpact: BusinessImpact;
  frameworkBreakdown: FrameworkRow[];
  topGaps: GapItem[];
  subscription: { plan: string };
  repositories: Repository[];
}

// ---- Helpers ----

function formatAUD(value: number): string {
  if (value >= 1_000_000) {
    return `AU$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `AU$${(value / 1_000).toFixed(0)}K`;
}

function dealRiskVariant(risk: string): "error" | "warning" | "info" | "success" {
  if (risk === "High") return "error";
  if (risk === "Medium") return "warning";
  if (risk === "Low") return "info";
  return "success";
}

function formatLastSync(lastSync: string | null): string {
  if (!lastSync) return "Never";
  const d = new Date(lastSync);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ---- Page ----

export default function ExecutivePage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/executive/summary")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load executive summary");
        }
        return res.json() as Promise<SummaryData>;
      })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load executive summary");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading executive summary&hellip;</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Summary</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{error ?? "No data available."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const { posture, businessImpact, frameworkBreakdown, topGaps, repositories } = data;

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Executive Summary
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Security posture and business risk at a glance
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/exports">
              <Button variant="secondary" size="sm">
                Export Report
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Business Impact Metrics */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          {/* Breach Exposure */}
          <Card variant="elevated">
            <CardContent className="py-5 px-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Breach Exposure
              </p>
              <p
                className={`text-2xl font-bold ${
                  businessImpact.breachExposure > 1_000_000
                    ? "text-red-600"
                    : businessImpact.breachExposure > 500_000
                    ? "text-orange-500"
                    : "text-gray-900"
                }`}
              >
                {formatAUD(businessImpact.breachExposure)}
              </p>
              <p className="text-xs text-gray-400 mt-1">estimated financial risk</p>
            </CardContent>
          </Card>

          {/* Regulatory Exposure */}
          <Card variant="elevated">
            <CardContent className="py-5 px-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Regulatory Exposure
              </p>
              <p
                className={`text-2xl font-bold ${
                  businessImpact.fineExposure > 500_000
                    ? "text-red-600"
                    : businessImpact.fineExposure > 200_000
                    ? "text-orange-500"
                    : "text-gray-900"
                }`}
              >
                {formatAUD(businessImpact.fineExposure)}
              </p>
              <p className="text-xs text-gray-400 mt-1">OAIC / APRA fine range</p>
            </CardContent>
          </Card>

          {/* Deal Risk */}
          <Card variant="elevated">
            <CardContent className="py-5 px-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Deal Risk
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={dealRiskVariant(businessImpact.dealBlockerRisk)}
                  size="lg"
                  dot
                >
                  {businessImpact.dealBlockerRisk}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mt-2">vendor / partner approval risk</p>
            </CardContent>
          </Card>

          {/* Days to Audit-Ready */}
          <Card variant="elevated">
            <CardContent className="py-5 px-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Days to Audit-Ready
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {businessImpact.daysToAuditReady}
              </p>
              <p className="text-xs text-gray-400 mt-1">estimated</p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Compliance Posture */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle>Compliance Posture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Score circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-accent-light to-accent/10 shadow-lg shadow-accent/10 shrink-0 mx-auto sm:mx-0"
              >
                <span className="text-3xl font-bold text-accent">{posture.score}%</span>
              </motion.div>

              {/* Progress bar + breakdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Coverage</span>
                  <span className="text-sm text-gray-500">
                    {posture.withEvidence} of {posture.total} controls
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${posture.score}%` }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="h-3 rounded-full"
                    style={{
                      backgroundColor:
                        posture.score >= 70
                          ? progress.high
                          : posture.score >= 40
                          ? progress.medium
                          : progress.low,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>
                    <span className="font-medium text-green-600">{posture.withEvidence}</span>{" "}
                    covered
                  </span>
                  {posture.partial > 0 && (
                    <span>
                      <span className="font-medium text-yellow-500">{posture.partial}</span>{" "}
                      partial
                    </span>
                  )}
                  <span>
                    <span className="font-medium text-red-500">{posture.noEvidence}</span>{" "}
                    missing
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Framework Breakdown */}
      {frameworkBreakdown.length > 0 && (
        <FadeIn delay={0.15}>
          <Card variant="elevated" className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle>Framework Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-3 pr-4">Framework</th>
                      <th className="pb-3 pr-4 text-right">Score</th>
                      <th className="pb-3 pr-4 text-right">Controls</th>
                      <th className="pb-3 text-right">Gaps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {frameworkBreakdown.map((fw, i) => (
                      <tr key={fw.name} className="group">
                        <td className="py-3 pr-4 font-medium text-gray-900">{fw.name}</td>
                        <td className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${fw.score}%` }}
                                transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                                className="h-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    fw.score >= 70
                                      ? progress.high
                                      : fw.score >= 40
                                      ? progress.medium
                                      : progress.low,
                                }}
                              />
                            </div>
                            <span
                              className={`font-semibold w-10 text-right ${
                                fw.score >= 70
                                  ? "text-green-600"
                                  : fw.score >= 40
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {fw.score}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-500">
                          {fw.withEvidence}/{fw.total}
                        </td>
                        <td className="py-3 text-right">
                          {fw.gaps > 0 ? (
                            <Badge variant="error" size="sm">{fw.gaps} gaps</Badge>
                          ) : (
                            <Badge variant="success" size="sm">None</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Top Gaps */}
      {topGaps.length > 0 && (
        <FadeIn delay={0.2}>
          <Card variant="elevated" className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle>Top Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <StaggerContainer className="space-y-2">
                {topGaps.map((gap) => (
                  <StaggerItem key={`${gap.framework}-${gap.code}`}>
                    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-gray-500 shrink-0">
                            {gap.code}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {gap.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{gap.framework}</p>
                      </div>
                      <Badge
                        variant={gap.severity === "missing" ? "error" : "warning"}
                        size="sm"
                        className="shrink-0"
                      >
                        {gap.severity === "missing" ? "Missing" : "Partial"}
                      </Badge>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Connected Repositories + Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {repositories.length > 0 && (
          <FadeIn delay={0.25}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Connected Repositories</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {repositories.map((repo) => (
                    <li
                      key={repo.name}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium text-gray-800 truncate">{repo.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatLastSync(repo.lastSync)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={0.3}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Export</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Download compliance reports for auditors, board members, or enterprise partners.
              </p>
              <Link href="/exports">
                <Button variant="primary" size="sm" className="w-full sm:w-auto">
                  Go to Exports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
