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

interface BreachCost {
  estimate: number;
  baseline: number;
  sizeMultiplier: number;
  industryMultiplier: number;
  gapMultiplier: number;
  sizeKey: string;
  industryKey: string;
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
  activeAudit: ActiveAudit | null;
  predictedOutcome: "likely_pass" | "pass_with_findings" | "at_risk";
  breachCost: BreachCost | null;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading security posture…</p>
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
                Security Posture requires a Pro subscription
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Posture trends, readiness scoring, and predicted audit outcomes are Pro features.
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

  const { readinessScore, postureTrend, activeAudit, predictedOutcome, breachCost } = data;

  const trendData = postureTrend.map((pt) => ({
    date: new Date(pt.snapshotDate).toLocaleDateString("en-AU", {
      month: "short",
      day: "numeric",
    }),
    score: pt.overallScore,
  }));

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Security Posture
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Audit readiness, posture trends, and business risk exposure
          </p>
        </div>
      </FadeIn>

      {/* Top Row Stat Cards */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
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

      {/* Breach Cost Exposure */}
      {breachCost && (
        <FadeIn delay={0.2}>
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Estimated Breach Cost Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(breachCost.estimate)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated AUD exposure based on current compliance gaps
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">IBM Cost of Data Breach 2024</p>
                  <p className="text-xs text-gray-400">Australian cohort baseline</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Baseline</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(breachCost.baseline)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Size factor</p>
                  <p className="text-sm font-medium text-gray-900">
                    {breachCost.sizeMultiplier.toFixed(2)}×
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gap multiplier</p>
                  <p className="text-sm font-medium text-gray-900">
                    {breachCost.gapMultiplier.toFixed(2)}×
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Reduce exposure by closing compliance gaps in the Evidence tab.
              </p>
            </CardContent>
          </Card>
        </FadeIn>
      )}

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

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `A$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `A$${(value / 1_000).toFixed(0)}K`;
  }
  return `A$${value.toFixed(0)}`;
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
