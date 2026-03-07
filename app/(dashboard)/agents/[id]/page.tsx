"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/Motion";

interface AgentEvent {
  id: string;
  category: string;
  action: string;
  summary: string;
  riskLevel: string;
  riskScore: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  controlMappings: ControlMapping[] | null;
  timestamp: string;
}

interface ControlMapping {
  frameworkName: string;
  controlCode: string;
  controlTitle: string;
  relevance: string;
}

interface SessionDetail {
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

interface RiskBreakdown {
  category: string;
  count: number;
  maxRisk: string;
  totalScore: number;
}

interface ComplianceRef {
  frameworkName: string;
  controlCode: string;
  controlTitle: string;
  count: number;
}

const RISK_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  low: "success",
  medium: "warning",
  high: "error",
  critical: "error",
};

const _CATEGORY_ICONS: Record<string, string> = {
  shell_exec: "terminal",
  file_write: "pencil",
  file_read: "eye",
  network_request: "globe",
  browser_action: "browser",
  credential_access: "key",
  session_management: "layers",
  agent_routing: "share",
  system_config: "settings",
};

const CATEGORY_LABELS: Record<string, string> = {
  shell_exec: "Shell",
  file_write: "File Write",
  file_read: "File Read",
  network_request: "Network",
  browser_action: "Browser",
  credential_access: "Credentials",
  session_management: "Session",
  agent_routing: "Agent Routing",
  system_config: "System Config",
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [riskBreakdown, setRiskBreakdown] = useState<RiskBreakdown[]>([]);
  const [complianceRefs, setComplianceRefs] = useState<ComplianceRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/agents/sessions/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          setEvents(data.events || []);
          setRiskBreakdown(data.riskBreakdown || []);
          setComplianceRefs(data.complianceReferences || []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Session not found</p>
        <Link href="/agents">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Agents (beta)
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6">
          <Link
            href="/agents"
            className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block"
          >
            ← Back to Agent Activity (beta)
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Session {session.externalId.slice(0, 16)}
            </h1>
            <Badge variant="default" size="sm">
              {session.agentFramework}
            </Badge>
            <Badge
              variant={
                session.status === "completed"
                  ? "success"
                  : session.status === "failed"
                    ? "error"
                    : session.status === "running"
                      ? "info"
                      : "warning"
              }
              size="sm"
            >
              {session.status}
            </Badge>
            <Badge variant={RISK_BADGE[session.riskLevel] || "default"} size="sm">
              Risk: {session.riskLevel}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Started {new Date(session.startedAt).toLocaleString()}
            {session.endedAt && ` · Ended ${new Date(session.endedAt).toLocaleString()}`}
            {" · "}
            {session.eventCount} events
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Breakdown */}
          {riskBreakdown.length > 0 && (
            <FadeIn delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle>Risk Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {riskBreakdown.map((rb) => (
                      <div key={rb.category} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">
                          {CATEGORY_LABELS[rb.category] || rb.category}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{rb.count}</span>
                          <Badge variant={RISK_BADGE[rb.maxRisk] || "default"} size="sm">
                            {rb.maxRisk}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Event Timeline */}
          <FadeIn delay={0.2}>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <button
                        onClick={() =>
                          setExpandedEvent(expandedEvent === event.id ? null : event.id)
                        }
                        className="w-full text-left px-6 py-4 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Risk dot */}
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                              event.riskLevel === "critical"
                                ? "bg-red-500"
                                : event.riskLevel === "high"
                                  ? "bg-orange-400"
                                  : event.riskLevel === "medium"
                                    ? "bg-yellow-400"
                                    : "bg-green-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="default" size="sm">
                                {CATEGORY_LABELS[event.category] || event.category}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 truncate">{event.summary}</p>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                              expandedEvent === event.id ? "rotate-180" : ""
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
                      {expandedEvent === event.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 pb-4 border-t border-gray-50"
                        >
                          <div className="pt-3 space-y-3">
                            {event.input && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Input</p>
                                <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-x-auto text-gray-700 max-h-40 overflow-y-auto">
                                  {JSON.stringify(event.input, null, 2)}
                                </pre>
                              </div>
                            )}
                            {event.output && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Output</p>
                                <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-x-auto text-gray-700 max-h-40 overflow-y-auto">
                                  {JSON.stringify(event.output, null, 2)}
                                </pre>
                              </div>
                            )}
                            {event.controlMappings && event.controlMappings.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Compliance Controls
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {event.controlMappings.map((cm, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                    >
                                      <span className="font-mono font-medium">
                                        {cm.controlCode}
                                      </span>
                                      <span className="text-blue-500">·</span>
                                      <span>{cm.controlTitle}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Sidebar: Compliance References */}
        <div className="space-y-6">
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Compliance References</CardTitle>
              </CardHeader>
              <CardContent>
                {complianceRefs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No compliance mappings for this session
                  </p>
                ) : (
                  <div className="space-y-4">
                    {groupByFramework(complianceRefs).map((group) => (
                      <div key={group.framework}>
                        <p className="text-xs font-medium text-gray-500 mb-2">{group.framework}</p>
                        <div className="space-y-1.5">
                          {group.controls.map((ctrl) => (
                            <div
                              key={ctrl.controlCode}
                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-mono font-medium text-gray-900">
                                  {ctrl.controlCode}
                                </span>
                                <p className="text-xs text-gray-500 truncate">
                                  {ctrl.controlTitle}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {ctrl.count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {session.summary && (
            <FadeIn delay={0.4}>
              <Card>
                <CardHeader>
                  <CardTitle>Session Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{session.summary}</p>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByFramework(refs: ComplianceRef[]) {
  const map = new Map<string, ComplianceRef[]>();
  for (const ref of refs) {
    if (!map.has(ref.frameworkName)) {
      map.set(ref.frameworkName, []);
    }
    map.get(ref.frameworkName)!.push(ref);
  }
  return Array.from(map.entries()).map(([framework, controls]) => ({
    framework,
    controls,
  }));
}
