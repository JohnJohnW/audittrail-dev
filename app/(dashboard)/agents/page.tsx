"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/Motion";

interface AgentSession {
  id: string;
  externalId: string;
  agentFramework: string;
  agentId: string | null;
  status: string;
  riskLevel: string;
  riskScore: number;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  eventCount: number;
}

interface Summary {
  totalSessions: number;
  activeSessions: number;
  totalEvents: number;
  riskDistribution: Record<string, number>;
  categoryBreakdown: { category: string; count: number }[];
}

const RISK_BADGE_VARIANT: Record<string, "success" | "warning" | "error" | "info"> = {
  low: "success",
  medium: "warning",
  high: "error",
  critical: "error",
};

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "error" | "info"> = {
  running: "info",
  completed: "success",
  failed: "error",
  timeout: "warning",
};

export default function AgentsPage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [sessionsRes, summaryRes] = await Promise.all([
        fetch("/api/agents/sessions?limit=50"),
        fetch("/api/agents/summary"),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent data");
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    if (!riskFilter) return sessions;
    return sessions.filter((s) => s.riskLevel === riskFilter);
  }, [sessions, riskFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <FadeIn>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Agent Activity{" "}
              <span className="text-sm font-normal text-gray-400 align-middle">
                (beta)
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor autonomous agent sessions and compliance
            </p>
          </div>
          <Link href="/settings">
            <Button variant="secondary" size="sm">
              Manage API Keys
            </Button>
          </Link>
        </div>
      </FadeIn>

      {/* Summary Stats */}
      {summary && (
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <StatCard label="Total Sessions" value={summary.totalSessions} />
            <StatCard label="Active Now" value={summary.activeSessions} accent />
            <StatCard label="Total Events" value={summary.totalEvents} />
            <RiskCard distribution={summary.riskDistribution} />
          </div>
        </FadeIn>
      )}

      {/* Risk Filter */}
      <FadeIn delay={0.15}>
        <div className="flex gap-2 mb-6 flex-wrap">
          <FilterButton active={!riskFilter} onClick={() => setRiskFilter(null)}>
            All
          </FilterButton>
          {["low", "medium", "high", "critical"].map((level) => (
            <FilterButton
              key={level}
              active={riskFilter === level}
              onClick={() => setRiskFilter(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
              {summary?.riskDistribution[level]
                ? ` (${summary.riskDistribution[level]})`
                : ""}
            </FilterButton>
          ))}
        </div>
      </FadeIn>

      {/* Sessions List */}
      <FadeIn delay={0.2}>
        {error ? (
          <Card>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <Button variant="secondary" size="sm" onClick={fetchData}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AgentIcon className="w-7 h-7 text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">No agent sessions yet</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Connect the OpenClaw connector to start monitoring agent activity.
                  Create an API key in Settings, then run the connector.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto text-left">
                  <p className="text-xs font-mono text-gray-600 mb-1">
                    $ npm install -g @audittrail/openclaw-connector
                  </p>
                  <p className="text-xs font-mono text-gray-600">
                    $ audittrail-connect --api-key atk_your_key
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {filteredSessions.map((session, index) => (
                  <Link key={session.id} href={`/agents/${session.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                      className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {session.externalId.slice(0, 16)}
                          </span>
                          <Badge variant="default" size="sm">
                            {session.agentFramework}
                          </Badge>
                          <Badge variant={STATUS_BADGE_VARIANT[session.status] || "default"} size="sm">
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {session.summary || `${session.eventCount} events`}
                          {" · "}
                          {formatRelativeTime(session.startedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs text-gray-400">{session.eventCount} events</span>
                        <Badge variant={RISK_BADGE_VARIANT[session.riskLevel] || "default"} size="sm">
                          {session.riskLevel}
                        </Badge>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}

// Sub-components

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-accent" : "text-gray-900"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function RiskCard({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-2">Risk Distribution</p>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
        {total > 0 && (
          <>
            {distribution.low > 0 && (
              <div
                className="bg-green-400 rounded-full"
                style={{ width: `${(distribution.low / total) * 100}%` }}
              />
            )}
            {distribution.medium > 0 && (
              <div
                className="bg-yellow-400 rounded-full"
                style={{ width: `${(distribution.medium / total) * 100}%` }}
              />
            )}
            {distribution.high > 0 && (
              <div
                className="bg-orange-400 rounded-full"
                style={{ width: `${(distribution.high / total) * 100}%` }}
              />
            )}
            {distribution.critical > 0 && (
              <div
                className="bg-red-500 rounded-full"
                style={{ width: `${(distribution.critical / total) * 100}%` }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
