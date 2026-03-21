"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface GapAssignment {
  id: string;
  controlCode: string;
  frameworkName: string;
  status: string;
  dueDate: string | null;
  assignee: { name: string; email: string };
}

interface FrameworkScore {
  framework: string;
  score: number;
  total: number;
  withEvidence: number;
}

interface ActiveAudit {
  id: string;
  frameworkName: string;
  status: string;
  targetCloseDate: string | null;
}

interface GRCData {
  summary: {
    score: number;
    total: number;
    withEvidence: number;
    partial: number;
    limited: number;
    noEvidence: number;
  };
  scoreDelta: number;
  frameworkScores: FrameworkScore[];
  gaps: {
    total: number;
    open: number;
    resolved: number;
    assignments: GapAssignment[];
  };
  treatments: {
    open?: number;
    in_progress?: number;
    closed?: number;
    overdue?: number;
  };
  activeAudits: ActiveAudit[];
}

function gapStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status.toLowerCase()) {
    case "open":
      return "error";
    case "resolved":
      return "success";
    case "in_progress":
      return "warning";
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

export default function GRCDashboardPage() {
  const [data, setData] = useState<GRCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboards/grc");
      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "PRO_REQUIRED") {
          setIsPro(false);
          return;
        }
      }
      if (!res.ok) throw new Error("Failed to fetch GRC dashboard");
      const json = await res.json();
      setData(json);
    } catch (error) {
      logger.error("Failed to fetch GRC dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading GRC dashboard…</p>
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
                GRC Dashboard requires a Pro subscription
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                The GRC dashboard with framework scorecards, gap ownership, and risk treatment
                tracking is a Pro feature.
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

  const { summary, scoreDelta, frameworkScores, gaps, treatments, activeAudits } = data;

  // summary.score is already a 0-100 percentage from getEvidenceSummary
  const scorePercent = summary.score;

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            GRC Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Governance, Risk &amp; Compliance operational view
          </p>
        </div>
      </FadeIn>

      {/* Score Cards Row */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <ScoreStatCard
            label="Overall Score"
            value={`${scorePercent}%`}
            subtitle={`${summary.withEvidence} / ${summary.total} controls`}
            highlight
          />
          <ScoreStatCard
            label="Score Delta (7d)"
            value={scoreDelta === 0 ? "-" : scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
            subtitle="vs 7 days ago"
            positive={scoreDelta >= 0}
          />
          <ScoreStatCard
            label="Open Gaps"
            value={String(gaps.open)}
            subtitle={`${gaps.total} total`}
            danger={gaps.open > 0}
          />
          <ScoreStatCard
            label="Active Treatments"
            value={String((treatments.open ?? 0) + (treatments.in_progress ?? 0))}
            subtitle={`${treatments.overdue ?? 0} overdue`}
            danger={(treatments.overdue ?? 0) > 0}
          />
        </div>
      </FadeIn>

      {/* Framework Scorecards */}
      <FadeIn delay={0.15}>
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Framework Scorecards</CardTitle>
          </CardHeader>
          <CardContent>
            {frameworkScores.length === 0 ? (
              <p className="text-sm text-gray-500">No framework data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {frameworkScores.map((fw) => {
                  // fw.score is already a 0-100 percentage from calculateFrameworkScores
                  const pct = Math.min(fw.score, 100);
                  return (
                    <div
                      key={fw.framework}
                      className="p-4 border border-gray-200 rounded-xl bg-gray-50/50"
                    >
                      <p className="text-sm font-semibold text-gray-800 mb-1 truncate">
                        {fw.framework}
                      </p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-accent">{pct}%</span>
                        <span className="text-xs text-gray-500">
                          {fw.withEvidence} / {fw.total} with evidence
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-accent rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Gap Assignments Table */}
      <FadeIn delay={0.2}>
        <Card variant="elevated" padding="none" className="mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Gap Assignments</h2>
          </div>
          {gaps.assignments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 text-sm">No gap assignments found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Control</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Framework</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Assignee</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Due Date</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gaps.assignments.map((assignment, i) => {
                    const isOverdue =
                      assignment.dueDate && new Date(assignment.dueDate) < new Date();
                    return (
                      <motion.tr
                        key={assignment.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-3 font-mono text-xs font-medium text-gray-900">
                          {assignment.controlCode}
                        </td>
                        <td className="px-6 py-3 text-gray-700">{assignment.frameworkName}</td>
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.assignee.name}</p>
                            <p className="text-xs text-gray-500">{assignment.assignee.email}</p>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "px-6 py-3",
                            isOverdue && assignment.status !== "resolved"
                              ? "text-red-600 font-medium"
                              : "text-gray-700"
                          )}
                        >
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={gapStatusVariant(assignment.status)} dot>
                            {assignment.status.replace("_", " ")}
                          </Badge>
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

      {/* Bottom Row: Risk Treatments + Active Audits */}
      <FadeIn delay={0.25}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Treatments */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Risk Treatments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <TreatmentPill
                  label="Open"
                  count={treatments.open ?? 0}
                  color="bg-blue-50 text-blue-700 border-blue-200"
                />
                <TreatmentPill
                  label="In Progress"
                  count={treatments.in_progress ?? 0}
                  color="bg-yellow-50 text-yellow-700 border-yellow-200"
                />
                <TreatmentPill
                  label="Closed"
                  count={treatments.closed ?? 0}
                  color="bg-green-50 text-green-700 border-green-200"
                />
                <TreatmentPill
                  label="Overdue"
                  count={treatments.overdue ?? 0}
                  color="bg-red-50 text-red-700 border-red-200"
                />
              </div>
              <div className="mt-4">
                <Button href="/risk-register" variant="secondary" size="sm">
                  View Risk Register →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Audits */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Active Audits</CardTitle>
            </CardHeader>
            <CardContent>
              {activeAudits.length === 0 ? (
                <p className="text-sm text-gray-500">No active audits.</p>
              ) : (
                <div className="space-y-3">
                  {activeAudits.map((audit) => (
                    <div
                      key={audit.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {audit.frameworkName}
                        </p>
                        {audit.targetCloseDate && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Target: {new Date(audit.targetCloseDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={auditStatusVariant(audit.status)} className="ml-3 shrink-0">
                        {audit.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Button href="/audits" variant="secondary" size="sm">
                  View All Audits →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    </div>
  );
}

function ScoreStatCard({
  label,
  value,
  subtitle,
  highlight,
  positive,
  danger,
}: {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
  positive?: boolean;
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
      <p
        className={cn(
          "text-2xl sm:text-3xl font-bold",
          danger ? "text-red-600" : positive === false ? "text-red-500" : "text-accent"
        )}
      >
        {value}
      </p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}

function TreatmentPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
        color
      )}
    >
      <span className="text-xl font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}
