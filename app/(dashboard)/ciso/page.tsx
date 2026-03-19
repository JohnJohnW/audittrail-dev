"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PostureTrendPoint {
  snapshotDate: string;
  overallScore: number;
}

interface CriticalRisk {
  id: string;
  controlCode: string;
  frameworkName: string;
  treatmentType: string;
  status: string;
  rationale: string;
  reviewDate: string | null;
}

interface ActiveAudit {
  id: string;
  framework: string;
  status: string;
  findingCount: number;
  targetCloseDate: string | null;
}

interface CISOData {
  currentScore: number;
  readinessScore: number;
  postureTrend: PostureTrendPoint[];
  summary: string;
  criticalRisks: CriticalRisk[];
  activeAudit: ActiveAudit | null;
  predictedOutcome: "likely_pass" | "pass_with_findings" | "at_risk";
  industry: string;
  companySize: string;
}

interface ExecutiveSummaryResponse {
  status: "unavailable" | "ok";
  summary?: string;
  generatedAt?: string;
}

function predictedOutcomeVariant(outcome: string): "success" | "warning" | "error" | "default" {
  switch (outcome) {
    case "likely_pass":
      return "success";
    case "pass_with_findings":
      return "warning";
    case "at_risk":
      return "error";
    default:
      return "default";
  }
}

function predictedOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "likely_pass":
      return "Likely Pass";
    case "pass_with_findings":
      return "Pass with Findings";
    case "at_risk":
      return "At Risk";
    default:
      return outcome;
  }
}

function riskStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status.toLowerCase()) {
    case "open":
      return "error";
    case "closed":
      return "success";
    case "in_progress":
      return "warning";
    case "accepted":
      return "info";
    default:
      return "default";
  }
}

function auditStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status.toLowerCase()) {
    case "planning":
      return "info";
    case "fieldwork":
      return "warning";
    case "reporting":
      return "warning";
    case "closed":
      return "success";
    default:
      return "default";
  }
}

export default function CISODashboardPage() {
  const [data, setData] = useState<CISOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [execSummary, setExecSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboards/ciso");
      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "PRO_REQUIRED") {
          setIsPro(false);
          return;
        }
      }
      if (!res.ok) throw new Error("Failed to fetch CISO dashboard");
      const json = await res.json();
      setData(json);
    } catch (error) {
      logger.error("Failed to fetch CISO dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const generateExecSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ciso/executive-summary", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate executive summary");
      const json: ExecutiveSummaryResponse = await res.json();
      setExecSummary(json);
    } catch (error) {
      logger.error("Failed to generate executive summary", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading CISO dashboard…</p>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-yellow-600"
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
            </div>
            <div>
              <p className="font-semibold text-yellow-800">
                CISO Dashboard requires a Pro subscription
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                The CISO dashboard with posture trend, readiness scoring, and AI executive summary
                generation is a Pro feature.
              </p>
              <a
                href="/settings"
                className="inline-block mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 transition-colors"
              >
                Upgrade to Pro →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  const { readinessScore, postureTrend, criticalRisks, activeAudit, predictedOutcome } = data;

  const trendData = postureTrend.map((pt) => ({
    date: new Date(pt.snapshotDate).toLocaleDateString("en-AU", {
      month: "short",
      day: "numeric",
    }),
    score: pt.overallScore,
  }));

  const isCached =
    execSummary?.status === "ok" &&
    execSummary.generatedAt &&
    new Date().getTime() - new Date(execSummary.generatedAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            CISO Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Executive security posture overview
          </p>
        </div>
      </FadeIn>

      {/* Top Row Stat Cards */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <CISOStatCard
            label="Readiness Score"
            value={`${readinessScore}%`}
            subtitle="audit readiness"
            highlight
          />
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col">
            <p className="text-sm text-gray-600 mb-2">Predicted Outcome</p>
            <Badge
              variant={predictedOutcomeVariant(predictedOutcome)}
              size="md"
              dot
              className="self-start"
            >
              {predictedOutcomeLabel(predictedOutcome)}
            </Badge>
          </div>
          <CISOStatCard
            label="Critical Risks"
            value={String(criticalRisks.length)}
            subtitle="requiring review"
            danger={criticalRisks.length > 0}
          />
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col">
            <p className="text-sm text-gray-600 mb-2">Active Audit</p>
            {activeAudit ? (
              <>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {activeAudit.framework}
                </p>
                <Badge
                  variant={auditStatusVariant(activeAudit.status)}
                  size="sm"
                  dot
                  className="mt-1 self-start"
                >
                  {activeAudit.status}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-gray-400">None</p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Posture Trend Chart */}
      <FadeIn delay={0.15}>
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Security Posture Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length < 2 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Not enough data to show trend. Check back after more snapshots are recorded.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        fontSize: 12,
                      }}
                      formatter={(value: number | undefined) => [
                        value !== undefined ? `${value}%` : "",
                        "Score",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-accent, #6366f1)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "var(--color-accent, #6366f1)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Critical Risks Table */}
      <FadeIn delay={0.2}>
        <Card variant="elevated" padding="none" className="mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Critical Risks</h2>
          </div>
          {criticalRisks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-500">No critical risks identified.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Control</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Framework</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Review Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {criticalRisks.map((risk, i) => {
                    const isOverdue = risk.reviewDate && new Date(risk.reviewDate) < new Date();
                    return (
                      <motion.tr
                        key={risk.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-3 font-mono text-xs font-medium text-gray-900">
                          {risk.controlCode}
                        </td>
                        <td className="px-6 py-3 text-gray-700">{risk.frameworkName}</td>
                        <td className="px-6 py-3 capitalize text-gray-700">{risk.treatmentType}</td>
                        <td className="px-6 py-3">
                          <Badge variant={riskStatusVariant(risk.status)} dot>
                            {risk.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            "px-6 py-3",
                            isOverdue && risk.status !== "closed"
                              ? "text-red-600 font-medium"
                              : "text-gray-700"
                          )}
                        >
                          {risk.reviewDate ? new Date(risk.reviewDate).toLocaleDateString() : "-"}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </FadeIn>

      {/* AI Executive Summary */}
      <FadeIn delay={0.25}>
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>AI Board Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Generate a board-ready narrative summarising your current security posture, key risks,
              and recommended actions.
            </p>

            {execSummary?.status === "ok" && execSummary.summary ? (
              <div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {execSummary.summary}
                </div>
                {isCached && execSummary.generatedAt && (
                  <p className="mt-2 text-xs text-gray-400">
                    Cached, refreshes every 24h · Generated{" "}
                    {new Date(execSummary.generatedAt).toLocaleString()}
                  </p>
                )}
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={generateExecSummary}
                    loading={summaryLoading}
                    disabled={summaryLoading}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : execSummary?.status === "unavailable" ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                AI summaries are not available right now. Please try again later.
              </div>
            ) : (
              <Button
                variant="accent"
                onClick={generateExecSummary}
                loading={summaryLoading}
                disabled={summaryLoading}
              >
                {summaryLoading
                  ? "Claude is drafting your board narrative…"
                  : "Generate Board Summary"}
              </Button>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Active Audit Panel */}
      {activeAudit && (
        <FadeIn delay={0.3}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Active Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{activeAudit.framework}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant={auditStatusVariant(activeAudit.status)} dot>
                      {activeAudit.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {activeAudit.findingCount} finding{activeAudit.findingCount !== 1 ? "s" : ""}
                    </span>
                    {activeAudit.targetCloseDate && (
                      <span className="text-sm text-gray-500">
                        Target: {new Date(activeAudit.targetCloseDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button href={`/audits/${activeAudit.id}`} variant="secondary" size="sm">
                  View Audit →
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}

function CISOStatCard({
  label,
  value,
  subtitle,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border shadow-sm p-4 sm:p-5",
        highlight
          ? "border-accent/30 bg-gradient-to-br from-accent-light/50 to-white"
          : "border-gray-200 bg-white"
      )}
    >
      <p className={cn("text-2xl sm:text-3xl font-bold", danger ? "text-red-600" : "text-accent")}>
        {value}
      </p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}
