"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  { value: "SOC 2", label: "SOC 2" },
  { value: "ISO 27001", label: "ISO 27001" },
  { value: "Essential Eight", label: "Essential Eight" },
  { value: "NIST CSF", label: "NIST CSF" },
  { value: "NIST SP 800-53", label: "NIST SP 800-53" },
  { value: "PCI DSS", label: "PCI DSS" },
];

const POLICY_TYPE_OPTIONS = [
  { value: "information_security", label: "Information Security" },
  { value: "access_control", label: "Access Control" },
  { value: "incident_response", label: "Incident Response" },
  { value: "change_management", label: "Change Management" },
  { value: "risk_management", label: "Risk Management" },
  { value: "data_protection", label: "Data Protection" },
];

const MODEL_OPTIONS = [
  { value: "claude-opus-4-20250514", label: "Opus (recommended)" },
  { value: "claude-sonnet-4-20250514", label: "Sonnet" },
];

const POLICY_TYPE_LABELS: Record<string, string> = {
  information_security: "Information Security",
  access_control: "Access Control",
  incident_response: "Incident Response",
  change_management: "Change Management",
  risk_management: "Risk Management",
  data_protection: "Data Protection",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneratedPolicy {
  id: string;
  frameworkName: string;
  policyType: string;
  title: string;
  content: string;
  status: string;
  tokensUsed: number | null;
  costCents: number | null;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function policyStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "draft":
      return "default";
    case "review":
      return "warning";
    case "approved":
      return "success";
    default:
      return "default";
  }
}

function policyStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "review":
      return "Review";
    case "approved":
      return "Approved";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function frameworkBadgeColor(framework: string): string {
  const map: Record<string, string> = {
    "ISO 27001": "bg-blue-50 text-blue-700 border-blue-200",
    "SOC 2": "bg-purple-50 text-purple-700 border-purple-200",
    "Essential Eight": "bg-orange-50 text-orange-700 border-orange-200",
    "NIST CSF": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "NIST SP 800-53": "bg-teal-50 text-teal-700 border-teal-200",
    "PCI DSS": "bg-red-50 text-red-700 border-red-200",
  };
  return map[framework] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Simple markdown-to-HTML renderer for policy content.
 * Handles headings, bold, italic, lists, and code blocks.
 */
function renderMarkdown(md: string): string {
  const html = md
    // Code blocks (fenced)
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, "").replace(/```$/g, "");
      return `<pre class="bg-gray-100 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-x-auto my-3">${escapeHtml(code)}</pre>`;
    })
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered list items
    .replace(
      /^- (.+)$/gm,
      '<li class="ml-4 list-disc text-sm text-gray-700 leading-relaxed">$1</li>'
    )
    // Ordered list items
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 list-decimal text-sm text-gray-700 leading-relaxed">$1</li>'
    )
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
    // Line breaks into paragraphs (for non-empty, non-tag lines)
    .replace(
      /^(?!<[hluop]|<li|<hr|<pre)(.+)$/gm,
      '<p class="text-sm text-gray-700 leading-relaxed mb-2">$1</p>'
    );

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<GeneratedPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate form state
  const [generating, setGenerating] = useState(false);
  const [genFramework, setGenFramework] = useState(FRAMEWORK_OPTIONS[0].value);
  const [genPolicyType, setGenPolicyType] = useState(POLICY_TYPE_OPTIONS[0].value);
  const [genCompanyContext, setGenCompanyContext] = useState("");
  const [genModel, setGenModel] = useState(MODEL_OPTIONS[0].value);
  const [genError, setGenError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(data.policies ?? []);
    } catch (error) {
      logger.error("Failed to fetch policies", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/agent/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkName: genFramework,
          policyType: genPolicyType,
          companyContext: genCompanyContext.trim() || undefined,
          model: genModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data.error || data.message || "Failed to generate policy. Please try again.";
        setGenError(message);
        return;
      }

      // Reset form and refresh list
      setGenCompanyContext("");
      await fetchPolicies();
    } catch (error) {
      logger.error("Failed to generate policy", error);
      setGenError("An unexpected error occurred. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (policyId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(policyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(policyId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading policies...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Policy Generator
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Generate complete compliance policies using AI. Review, edit, and approve before
            exporting.
          </p>
        </div>
      </FadeIn>

      {/* Generate section */}
      <FadeIn delay={0.05}>
        <Card variant="elevated" className="mb-6 sm:mb-8">
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Policy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Framework */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Framework</label>
                <select
                  value={genFramework}
                  onChange={(e) => setGenFramework(e.target.value)}
                  disabled={generating}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  {FRAMEWORK_OPTIONS.map((fw) => (
                    <option key={fw.value} value={fw.value}>
                      {fw.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Policy type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Policy Type
                </label>
                <select
                  value={genPolicyType}
                  onChange={(e) => setGenPolicyType(e.target.value)}
                  disabled={generating}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  {POLICY_TYPE_OPTIONS.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Company context */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Company Context <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={genCompanyContext}
                onChange={(e) => setGenCompanyContext(e.target.value)}
                disabled={generating}
                placeholder="Describe your company, industry, team size, infrastructure, or any specific requirements..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all min-h-[80px] resize-y disabled:opacity-50"
              />
            </div>

            {/* Model selector and generate button */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                <select
                  value={genModel}
                  onChange={(e) => setGenModel(e.target.value)}
                  disabled={generating}
                  className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="accent"
                size="lg"
                loading={generating}
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? "Generating policy..." : "Generate Policy"}
              </Button>
            </div>

            {/* Generating indicator */}
            {generating && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-accent/5 rounded-lg border border-accent/10">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent shrink-0" />
                <p className="text-sm text-gray-700">
                  Generating policy... This may take 30-60 seconds depending on the model.
                </p>
              </div>
            )}

            {/* Error message */}
            {genError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{genError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Policy list */}
      <FadeIn delay={0.1}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Generated Policies</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {policies.length} {policies.length === 1 ? "policy" : "policies"} generated
          </p>
        </div>

        {policies.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="py-8 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7 text-gray-400"
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
                <p className="text-gray-900 font-medium mb-1">No policies yet</p>
                <p className="text-sm text-gray-500">
                  Use the form above to generate your first compliance policy.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {policies.map((policy, i) => {
              const isExpanded = expandedPolicyId === policy.id;

              return (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    variant="elevated"
                    padding="none"
                    className={cn("transition-all", isExpanded && "ring-1 ring-accent/20")}
                  >
                    {/* Policy card header */}
                    <div
                      onClick={() => setExpandedPolicyId(isExpanded ? null : policy.id)}
                      className="px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {policy.title ||
                                `${POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType} Policy`}
                            </h3>
                            <svg
                              className={cn(
                                "w-4 h-4 text-gray-400 shrink-0 transition-transform",
                                isExpanded && "rotate-180"
                              )}
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                                frameworkBadgeColor(policy.frameworkName)
                              )}
                            >
                              {policy.frameworkName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={policyStatusVariant(policy.status)}>
                            {policyStatusLabel(policy.status)}
                          </Badge>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(policy.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-gray-100">
                            {/* Actions bar */}
                            <div className="flex items-center gap-2 py-3 mb-3 border-b border-gray-100">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(policy.id, policy.content);
                                }}
                              >
                                {copiedId === policy.id ? (
                                  <>
                                    <svg
                                      className="w-3.5 h-3.5 text-green-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                    Copy to Clipboard
                                  </>
                                )}
                              </Button>

                              {policy.tokensUsed && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  {policy.tokensUsed.toLocaleString()} tokens
                                  {policy.costCents
                                    ? ` ($${(policy.costCents / 100).toFixed(2)})`
                                    : ""}
                                </span>
                              )}
                            </div>

                            {/* Rendered markdown content */}
                            <div
                              className="prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: renderMarkdown(policy.content),
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </FadeIn>
    </div>
  );
}
