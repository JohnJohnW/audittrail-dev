"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";
import { getContextualLoadingPhrase } from "@/lib/utils/loading-phrases";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedControl {
  code: string;
  title: string;
  description: string;
}

interface MatchedSource {
  sourceType: string;
  sourceId: string;
  similarity: number;
}

interface MappedControl {
  code: string;
  title: string;
  description: string;
  evidenceCount: number;
  maxSimilarity: number;
  confidenceTier: "high" | "medium" | "low";
  matchedSources: MatchedSource[];
}

interface MappingResult {
  frameworkName: string;
  totalControls: number;
  coveredControls: number;
  coveragePercent: number;
  highConfidenceCount: number;
  controls: MappedControl[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_CONTROLS = `AC-1: Access Control Policy
Ensure documented access control policies exist and are reviewed annually.

AC-2: Account Management
Implement account management processes including provisioning and de-provisioning.`;

const tierConfig: Record<
  MappedControl["confidenceTier"],
  { label: string; variant: "success" | "warning" | "error" }
> = {
  high: { label: "High", variant: "success" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "error" },
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse textarea content into individual controls.
 * Format per block:
 *   CODE: TITLE
 *   Description line(s)...
 * Blocks are separated by one or more blank lines.
 */
function parseControls(text: string): ParsedControl[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const controls: ParsedControl[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    const firstLine = lines[0].trim();
    const colonIdx = firstLine.indexOf(":");
    if (colonIdx === -1) continue;

    const code = firstLine.slice(0, colonIdx).trim();
    const title = firstLine.slice(colonIdx + 1).trim();
    const description = lines
      .slice(1)
      .map((l) => l.trim())
      .join(" ")
      .trim();

    if (code && title) {
      controls.push({ code, title, description });
    }
  }

  return controls;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent ? "bg-accent/5 border-accent/30" : "bg-gray-50 border-gray-200"
      )}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", accent ? "text-accent" : "text-gray-900")}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ControlRow({ control }: { control: MappedControl }) {
  const [expanded, setExpanded] = useState(false);
  const tier = tierConfig[control.confidenceTier];

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-6 py-4 hover:bg-gray-50/60 transition-colors focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {control.code}
                </span>
                <span className="font-medium text-gray-900 text-sm truncate">{control.title}</span>
              </div>
              {control.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{control.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-500 hidden sm:block">
              {control.evidenceCount} source{control.evidenceCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-medium text-gray-500 hidden sm:block tabular-nums">
              {(control.maxSimilarity * 100).toFixed(0)}%
            </span>
            <Badge variant={tier.variant}>{tier.label}</Badge>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 pl-14">
              {control.matchedSources.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No matching evidence found.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Matched Sources
                  </p>
                  {control.matchedSources.map((src, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="default" size="sm">
                          {src.sourceType}
                        </Badge>
                        <span className="text-xs text-gray-600 truncate font-mono">
                          {src.sourceId}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-shrink-0 tabular-nums">
                        {(src.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomFrameworkPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [frameworkName, setFrameworkName] = useState("");
  const [controlsText, setControlsText] = useState("");
  const [parsedControls, setParsedControls] = useState<ParsedControl[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState(false);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);

  useEffect(() => {
    checkProStatus();
  }, []);

  const checkProStatus = async () => {
    try {
      const res = await fetch("/api/dashboards/grc");
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setIsPro(body?.code !== "PRO_REQUIRED");
      } else if (res.ok) {
        setIsPro(true);
      } else {
        setIsPro(false);
      }
    } catch (error) {
      logger.error("Failed to check pro status", error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const handleParse = () => {
    setParseError(null);
    setResult(null);
    setMappingError(null);

    if (!controlsText.trim()) {
      setParseError("Paste at least one control definition to parse.");
      setParsedControls(null);
      return;
    }

    const controls = parseControls(controlsText);
    if (controls.length === 0) {
      setParseError(
        'Could not parse any controls. Make sure each block starts with "CODE: TITLE" followed by a description.'
      );
      setParsedControls(null);
      return;
    }

    setParsedControls(controls);
  };

  const handleMap = async () => {
    if (!parsedControls || parsedControls.length === 0 || !isPro) return;

    if (!frameworkName.trim()) {
      setMappingError("Please enter a framework name before mapping.");
      return;
    }

    setMapping(true);
    setMappingError(null);
    setResult(null);

    try {
      const res = await fetch("/api/frameworks/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkName: frameworkName.trim(),
          controls: parsedControls,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.requiresUpgrade) {
          setIsPro(false);
          return;
        }
        throw new Error(body?.error || `Mapping failed (${res.status})`);
      }

      const data: MappingResult = await res.json();
      setResult(data);
    } catch (error) {
      logger.error("Custom framework mapping failed", error);
      setMappingError(error instanceof Error ? error.message : "Mapping failed. Please try again.");
    } finally {
      setMapping(false);
    }
  };

  const handleReset = () => {
    setParsedControls(null);
    setResult(null);
    setMappingError(null);
    setParseError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">{getContextualLoadingPhrase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Custom Framework Mapping
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Map any compliance framework to your evidence corpus using AI. Paste control definitions
            below and we&apos;ll find matching evidence using semantic similarity.
          </p>
        </div>
      </FadeIn>

      {/* Input Form */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle>Define Your Framework</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pro Gate Banner */}
            {!isPro && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <WarningIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">
                      Pro feature — custom framework mapping requires an upgrade
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      AI-powered evidence mapping for custom frameworks is a Pro feature. Pro also
                      unlocks multimodal evidence upload, the auditor portal, and all compliance
                      dashboards.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 transition-colors"
                    >
                      Upgrade to Pro →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              {/* Framework Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Framework Name
                </label>
                <input
                  type="text"
                  value={frameworkName}
                  onChange={(e) => setFrameworkName(e.target.value)}
                  disabled={!isPro}
                  placeholder="e.g. NIST SP 800-53, ISO 27001, Internal Security Policy"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Controls Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Control Definitions
                  </label>
                  {!controlsText && (
                    <button
                      onClick={() => setControlsText(EXAMPLE_CONTROLS)}
                      disabled={!isPro}
                      className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Load example
                    </button>
                  )}
                </div>
                <textarea
                  value={controlsText}
                  onChange={(e) => {
                    setControlsText(e.target.value);
                    // Clear parsed result if user edits after parsing
                    if (parsedControls) {
                      setParsedControls(null);
                      setParseError(null);
                    }
                  }}
                  disabled={!isPro}
                  rows={10}
                  placeholder={EXAMPLE_CONTROLS}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  One control per block. Format:{" "}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">CODE: TITLE</code>{" "}
                  followed by description. Separate controls with a blank line.
                </p>
              </div>

              {/* Parse Error */}
              <AnimatePresence>
                {parseError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700"
                  >
                    {parseError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Parse Button */}
              {!parsedControls && (
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={handleParse}
                    disabled={!isPro || !controlsText.trim()}
                  >
                    Parse Controls
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Parsed Controls Preview */}
      <AnimatePresence>
        {parsedControls && !result && (
          <FadeIn delay={0}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="mb-8"
            >
              <Card variant="elevated">
                <CardHeader
                  action={
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Edit controls
                    </button>
                  }
                >
                  <CardTitle>
                    Parsed <span className="text-accent">{parsedControls.length}</span> control
                    {parsedControls.length !== 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-6">
                    {parsedControls.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3"
                      >
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                          {c.code}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{c.title}</p>
                          {c.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mapping Error */}
                  <AnimatePresence>
                    {mappingError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700"
                      >
                        {mappingError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Loading State */}
                  <AnimatePresence>
                    {mapping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-4 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 mb-4"
                      >
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-accent">
                            Mapping controls to evidence using AI...
                          </p>
                          <p className="text-xs text-accent/70 mt-0.5">
                            This may take 30–60 seconds depending on the number of controls.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <SparklesIcon className="w-4 h-4" />
                      <span>Uses Gemini embeddings to find semantic matches in your evidence</span>
                    </div>
                    <Button
                      variant="accent"
                      onClick={handleMap}
                      disabled={!isPro || mapping}
                      loading={mapping}
                      className="min-w-[160px]"
                    >
                      {mapping ? "Mapping..." : "Map to Evidence"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </FadeIn>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {/* Summary Cards */}
            <FadeIn delay={0}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Mapping Results — {result.frameworkName}
                  </h2>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Start over
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <SummaryStatCard
                    label="Total Controls"
                    value={result.totalControls}
                    sub="in your framework"
                  />
                  <SummaryStatCard
                    label="Coverage"
                    value={`${result.coveragePercent.toFixed(0)}%`}
                    sub={`${result.coveredControls} of ${result.totalControls} controls covered`}
                    accent
                  />
                  <SummaryStatCard
                    label="High Confidence"
                    value={result.highConfidenceCount}
                    sub="controls with strong evidence match"
                  />
                </div>
              </div>
            </FadeIn>

            {/* Controls Table */}
            <FadeIn delay={0.1}>
              <Card padding="none" variant="elevated">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <GridIcon className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">Control Mapping Detail</h2>
                </div>

                {/* Table Header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Control
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                    Sources
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                    Similarity
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                    Confidence
                  </span>
                </div>

                <div>
                  {result.controls.map((control) => (
                    <ControlRow key={control.code} control={control} />
                  ))}
                </div>

                {result.controls.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">
                      No controls were returned in the mapping result.
                    </p>
                  </div>
                )}
              </Card>
            </FadeIn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
