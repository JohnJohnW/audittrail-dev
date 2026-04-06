"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RunState = "idle" | "configuring" | "running" | "completed" | "error";
type SufficiencyRating = "sufficient" | "partial" | "insufficient" | "not_evidenced";
type ModelId = "claude-opus-4-20250514" | "claude-sonnet-4-20250514";

interface ControlToAssess {
  code: string;
  framework: string;
  frameworkName: string;
  name: string;
  requiresHumanAction: boolean;
}

interface Assessment {
  id: string;
  controlCode: string;
  frameworkName: string;
  controlName: string;
  sufficiencyRating: SufficiencyRating;
  confidenceScore: number | null;
  auditNarrative: string | null;
  agentReasoning: string | null;
  remediationPlan: string | null;
  assessedAt: string;
}

interface AgentRun {
  id: string;
  status: string;
  frameworks: string[];
  controlsAssessed: number;
  controlsSufficient: number;
  controlsPartial: number;
  controlsInsufficient: number;
  modelUsed: string;
  tokensUsed: number;
  costCents: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  controlAssessments?: Assessment[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMEWORK_OPTIONS = [
  { key: "SOC 2", label: "SOC 2" },
  { key: "ISO 27001", label: "ISO 27001" },
  { key: "NIST CSF", label: "NIST CSF" },
  { key: "NIST SP 800-53", label: "NIST SP 800-53" },
  { key: "Essential Eight", label: "Essential Eight" },
  { key: "PCI DSS", label: "PCI DSS" },
] as const;

const MODEL_OPTIONS: { id: ModelId; label: string; description: string }[] = [
  {
    id: "claude-opus-4-20250514",
    label: "Claude Opus",
    description: "Recommended",
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet",
    description: "Faster, lower cost",
  },
];

const RATING_STYLES: Record<SufficiencyRating, { bg: string; text: string; label: string }> = {
  sufficient: { bg: "bg-green-100", text: "text-green-800", label: "Sufficient" },
  partial: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Partial" },
  insufficient: { bg: "bg-red-100", text: "text-red-800", label: "Insufficient" },
  not_evidenced: { bg: "bg-gray-100", text: "text-gray-600", label: "Not Evidenced" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RatingBadge({ rating }: { rating: SufficiencyRating }) {
  const style = RATING_STYLES[rating] ?? RATING_STYLES.not_evidenced;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AgentPage() {
  // ---- State ----
  const [runState, setRunState] = useState<RunState>("idle");
  const [model, setModel] = useState<ModelId>("claude-opus-4-20250514");
  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(
    () => new Set(FRAMEWORK_OPTIONS.map((f) => f.key))
  );

  // Run data
  const [_agentRunId, setAgentRunId] = useState<string | null>(null);
  const [controlsToAssess, setControlsToAssess] = useState<ControlToAssess[]>([]);
  const [assessedIndex, setAssessedIndex] = useState(0);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [runningCostCents, setRunningCostCents] = useState(0);
  const [estimatedCostCents, setEstimatedCostCents] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History
  const [runHistory, setRunHistory] = useState<AgentRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Latest completed run (from history or just-finished)
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);

  // Expandable controls
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set());
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());

  const abortRef = useRef(false);

  // ---- Fetch run history on mount ----
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/agent/run");
      if (!res.ok) throw new Error("Failed to load run history");
      const data = await res.json();
      setRunHistory(data.runs ?? []);

      // Load the latest completed run as default results view
      const latestCompleted = (data.runs ?? []).find((r: AgentRun) => r.status === "completed");
      if (latestCompleted && !selectedRun) {
        loadRunDetails(latestCompleted.id);
      }
    } catch (err) {
      logger.error("Failed to fetch agent run history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ---- Load a specific run's details ----
  const loadRunDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/agent/run/${runId}`);
      if (!res.ok) throw new Error("Failed to load run details");
      const data = await res.json();
      setSelectedRun(data.run);
    } catch (err) {
      logger.error("Failed to load run details", err);
    }
  };

  // ---- Toggle framework selection ----
  const toggleFramework = (key: string) => {
    setSelectedFrameworks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllFrameworks = () => {
    if (selectedFrameworks.size === FRAMEWORK_OPTIONS.length) {
      setSelectedFrameworks(new Set([FRAMEWORK_OPTIONS[0].key]));
    } else {
      setSelectedFrameworks(new Set(FRAMEWORK_OPTIONS.map((f) => f.key)));
    }
  };

  // ---- Start an agent run ----
  const startRun = async () => {
    abortRef.current = false;
    setRunState("running");
    setAssessments([]);
    setAssessedIndex(0);
    setRunningCostCents(0);
    setErrorMessage(null);

    try {
      // 1. Create the run
      const createRes = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          frameworks: Array.from(selectedFrameworks),
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.message ?? `Failed to create run (${createRes.status})`);
      }

      const createData = await createRes.json();
      const { agentRunId: runId, controls, estimatedCostCents: estCost } = createData;

      setAgentRunId(runId);
      setControlsToAssess(controls);
      setEstimatedCostCents(estCost);

      // 2. Sequentially assess each control
      let accumulatedCost = 0;
      const collectedAssessments: Assessment[] = [];

      for (let i = 0; i < controls.length; i++) {
        if (abortRef.current) break;

        const ctrl = controls[i];
        setAssessedIndex(i);

        try {
          const assessRes = await fetch(`/api/agent/run/${runId}/assess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              controlCode: ctrl.code,
              frameworkName: ctrl.frameworkName,
            }),
          });

          const assessData = await assessRes.json();

          if (assessData.assessment) {
            collectedAssessments.push(assessData.assessment);
            setAssessments([...collectedAssessments]);

            // Track cost from the assessment response
            if (assessData.assessment.costCents) {
              accumulatedCost += assessData.assessment.costCents;
            }
            setRunningCostCents(accumulatedCost);
          }
        } catch (controlErr) {
          logger.error(`Failed to assess control ${ctrl.code}`, controlErr);
          // Continue with the next control instead of aborting the whole run
        }
      }

      // 3. Complete - refresh history and load the final run
      setRunState("completed");
      await fetchHistory();
      await loadRunDetails(runId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent run failed";
      setErrorMessage(message);
      setRunState("error");
      logger.error("Agent run failed", err);
    }
  };

  const cancelRun = () => {
    abortRef.current = true;
    setRunState("idle");
  };

  // ---- Toggle helpers for expandable sections ----
  const toggleControl = (code: string) => {
    setExpandedControls((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleFrameworkGroup = (fw: string) => {
    setExpandedFrameworks((prev) => {
      const next = new Set(prev);
      if (next.has(fw)) next.delete(fw);
      else next.add(fw);
      return next;
    });
  };

  // ---- Compute display data for results ----
  const resultsRun = selectedRun;
  const resultsAssessments = resultsRun?.controlAssessments ?? [];

  const resultsByFramework = resultsAssessments.reduce<Record<string, Assessment[]>>((acc, a) => {
    const fw = a.frameworkName;
    if (!acc[fw]) acc[fw] = [];
    acc[fw].push(a);
    return acc;
  }, {});

  const summaryStats = {
    total: resultsAssessments.length,
    sufficient: resultsAssessments.filter((a) => a.sufficiencyRating === "sufficient").length,
    partial: resultsAssessments.filter((a) => a.sufficiencyRating === "partial").length,
    insufficient: resultsAssessments.filter((a) => a.sufficiencyRating === "insufficient").length,
    notEvidenced: resultsAssessments.filter((a) => a.sufficiencyRating === "not_evidenced").length,
    cost: resultsRun?.costCents ?? 0,
  };

  // ---- Per-control cost estimate for display ----
  const perControlCostCents = model === "claude-opus-4-20250514" ? 52 : 6;
  const estimatedControlCount =
    selectedFrameworks.size === FRAMEWORK_OPTIONS.length
      ? "all"
      : `${selectedFrameworks.size} framework${selectedFrameworks.size !== 1 ? "s" : ""}`;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-8 pb-12">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Compliance Agent</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Run an AI-powered assessment of your compliance controls. The agent investigates
            evidence, writes audit narratives, and identifies gaps.
          </p>
        </div>
      </FadeIn>

      {/* ----------------------------------------------------------------- */}
      {/* Run Agent Section                                                 */}
      {/* ----------------------------------------------------------------- */}
      {(runState === "idle" || runState === "configuring" || runState === "error") && (
        <FadeIn delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>Run Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Model Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as ModelId)}
                    className="block w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none transition-colors"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.description})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Framework Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Frameworks</label>
                    <button
                      type="button"
                      onClick={toggleAllFrameworks}
                      className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                    >
                      {selectedFrameworks.size === FRAMEWORK_OPTIONS.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FRAMEWORK_OPTIONS.map((fw) => {
                      const checked = selectedFrameworks.has(fw.key);
                      return (
                        <label
                          key={fw.key}
                          className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-all ${
                            checked
                              ? "border-accent bg-accent-light text-gray-900"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFramework(fw.key)}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked
                                ? "border-accent bg-accent text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {checked && (
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
                          {fw.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Estimate + Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{estimatedControlCount}</span>{" "}
                    selected &middot; ~
                    <span className="font-medium text-gray-700">
                      {formatCost(perControlCostCents)}
                    </span>{" "}
                    per control ({model === "claude-opus-4-20250514" ? "Opus" : "Sonnet"})
                  </div>
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={startRun}
                    className="px-6 py-3 font-semibold"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Run AI Assessment
                  </Button>
                </div>

                {/* Error message */}
                {runState === "error" && errorMessage && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex gap-3">
                      <svg
                        className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">Run failed</p>
                        <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Progress View (during a run)                                      */}
      {/* ----------------------------------------------------------------- */}
      {runState === "running" && (
        <FadeIn>
          <Card>
            <CardHeader
              action={
                <Button variant="ghost" size="sm" onClick={cancelRun}>
                  Cancel
                </Button>
              }
            >
              <CardTitle>Assessment in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {assessments.length} / {controlsToAssess.length} controls
                    </span>
                    <span className="text-sm text-gray-500">
                      Cost: {formatCost(runningCostCents)} / est. {formatCost(estimatedCostCents)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${controlsToAssess.length > 0 ? (assessments.length / controlsToAssess.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Current control */}
                {controlsToAssess[assessedIndex] && (
                  <div className="flex items-center gap-3 rounded-lg bg-accent-light border border-accent/20 px-4 py-3">
                    <div className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-30" />
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-accent items-center justify-center">
                        <svg
                          className="h-3 w-3 text-white animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Assessing: {controlsToAssess[assessedIndex].name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {controlsToAssess[assessedIndex].frameworkName} &middot;{" "}
                        {controlsToAssess[assessedIndex].code}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed list */}
                {assessments.length > 0 && (
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {[...assessments].reverse().map((a) => (
                      <div
                        key={a.controlCode}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">{a.controlName}</p>
                          <p className="text-xs text-gray-500">
                            {a.frameworkName} &middot; {a.controlCode}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0">
                          <RatingBadge rating={a.sufficiencyRating} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Results Section                                                   */}
      {/* ----------------------------------------------------------------- */}
      {resultsRun && runState !== "running" && (
        <FadeIn delay={0.05}>
          <div className="space-y-6">
            {/* Summary cards */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Results</h2>
              <StaggerContainer
                fast
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
              >
                <StaggerItem>
                  <Card className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{summaryStats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Assessed</p>
                  </Card>
                </StaggerItem>
                <StaggerItem>
                  <Card className="text-center">
                    <p className="text-2xl font-bold text-green-700">{summaryStats.sufficient}</p>
                    <p className="text-xs text-gray-500 mt-1">Sufficient</p>
                  </Card>
                </StaggerItem>
                <StaggerItem>
                  <Card className="text-center">
                    <p className="text-2xl font-bold text-yellow-700">{summaryStats.partial}</p>
                    <p className="text-xs text-gray-500 mt-1">Partial</p>
                  </Card>
                </StaggerItem>
                <StaggerItem>
                  <Card className="text-center">
                    <p className="text-2xl font-bold text-red-700">{summaryStats.insufficient}</p>
                    <p className="text-xs text-gray-500 mt-1">Insufficient</p>
                  </Card>
                </StaggerItem>
                <StaggerItem>
                  <Card className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCost(summaryStats.cost)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Cost</p>
                  </Card>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Controls grouped by framework */}
            <div className="space-y-4">
              {Object.entries(resultsByFramework).map(([framework, fwAssessments]) => {
                const isExpanded = expandedFrameworks.has(framework);
                const fwSufficient = fwAssessments.filter(
                  (a) => a.sufficiencyRating === "sufficient"
                ).length;

                return (
                  <Card key={framework} padding="none">
                    <button
                      type="button"
                      onClick={() => toggleFrameworkGroup(framework)}
                      className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{framework}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {fwAssessments.length} controls &middot; {fwSufficient} sufficient
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1">
                          {(
                            ["sufficient", "partial", "insufficient", "not_evidenced"] as const
                          ).map((rating) => {
                            const count = fwAssessments.filter(
                              (a) => a.sufficiencyRating === rating
                            ).length;
                            if (count === 0) return null;
                            return <RatingBadge key={rating} rating={rating} />;
                          })}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {fwAssessments.map((assessment) => {
                          const isControlExpanded = expandedControls.has(assessment.controlCode);
                          return (
                            <div
                              key={assessment.controlCode}
                              className="border-b border-gray-50 last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => toggleControl(assessment.controlCode)}
                                className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <svg
                                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isControlExpanded ? "rotate-90" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-900 truncate">
                                      <span className="font-medium text-gray-500 mr-1.5">
                                        {assessment.controlCode}
                                      </span>
                                      {assessment.controlName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 ml-3 shrink-0">
                                  <ConfidenceBar score={assessment.confidenceScore} />
                                  <RatingBadge rating={assessment.sufficiencyRating} />
                                </div>
                              </button>

                              {isControlExpanded && (
                                <div className="px-4 sm:px-6 pb-4 pt-1 ml-7 space-y-3">
                                  {assessment.auditNarrative && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                                        Audit Narrative
                                      </p>
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {assessment.auditNarrative}
                                      </p>
                                    </div>
                                  )}
                                  {assessment.agentReasoning && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                                        Agent Reasoning
                                      </p>
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {assessment.agentReasoning}
                                      </p>
                                    </div>
                                  )}
                                  {assessment.remediationPlan && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                                        Remediation Plan
                                      </p>
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {assessment.remediationPlan}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Run History                                                       */}
      {/* ----------------------------------------------------------------- */}
      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : runHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-10 w-10 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-sm text-gray-500 mt-3">
                  No runs yet. Run your first assessment above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden sm:table-cell">
                        Model
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                        Controls
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden sm:table-cell">
                        Results
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                        Cost
                      </th>
                      <th className="px-4 sm:px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {runHistory.map((run) => {
                      const statusBadgeVariant =
                        run.status === "completed"
                          ? "success"
                          : run.status === "running" || run.status === "pending"
                            ? "warning"
                            : run.status === "failed"
                              ? "error"
                              : "default";

                      const modelLabel = run.modelUsed.includes("opus")
                        ? "Opus"
                        : run.modelUsed.includes("sonnet")
                          ? "Sonnet"
                          : run.modelUsed;

                      return (
                        <tr
                          key={run.id}
                          className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-3 text-gray-900 whitespace-nowrap">
                            {formatDate(run.createdAt)}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <Badge variant={statusBadgeVariant} dot>
                              {run.status}
                            </Badge>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 hidden sm:table-cell">
                            {modelLabel}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right text-gray-900 tabular-nums">
                            {run.controlsAssessed}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right hidden sm:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              {run.controlsSufficient > 0 && (
                                <span className="text-xs text-green-700">
                                  {run.controlsSufficient}
                                  <span className="text-green-500 ml-0.5">S</span>
                                </span>
                              )}
                              {run.controlsPartial > 0 && (
                                <span className="text-xs text-yellow-700">
                                  {run.controlsPartial}
                                  <span className="text-yellow-500 ml-0.5">P</span>
                                </span>
                              )}
                              {run.controlsInsufficient > 0 && (
                                <span className="text-xs text-red-700">
                                  {run.controlsInsufficient}
                                  <span className="text-red-500 ml-0.5">I</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right text-gray-900 tabular-nums">
                            {formatCost(run.costCents)}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            {run.status === "completed" && (
                              <button
                                type="button"
                                onClick={() => loadRunDetails(run.id)}
                                className={`text-xs font-medium transition-colors ${
                                  selectedRun?.id === run.id
                                    ? "text-accent"
                                    : "text-gray-400 hover:text-accent"
                                }`}
                              >
                                {selectedRun?.id === run.id ? "Viewing" : "View"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
