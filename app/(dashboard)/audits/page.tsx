"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const FRAMEWORK_OPTIONS = [
  "ISO 27001",
  "SOC 2",
  "Essential Eight",
  "NIST CSF",
  "NIST SP 800-53",
  "PCI DSS",
];

const AUDIT_TYPE_OPTIONS = ["external", "internal", "self-assessment"];

type AuditStatus = "planning" | "fieldwork" | "reporting" | "closed";
type AuditOutcome = "passed" | "qualified" | "adverse" | "disclaimer" | null;

interface AuditCycle {
  id: string;
  frameworkName: string;
  auditType: string;
  status: AuditStatus;
  periodStart: string;
  periodEnd: string;
  auditorName: string | null;
  auditorFirm: string | null;
  outcome: AuditOutcome;
  targetCloseDate: string | null;
  _count: { findings: number; requests: number };
}

interface AuditCyclesResponse {
  cycles: AuditCycle[];
}

interface NewAuditForm {
  frameworkName: string;
  auditType: string;
  periodStart: string;
  periodEnd: string;
  auditorName: string;
  auditorFirm: string;
  targetCloseDate: string;
}

function auditStatusVariant(
  status: AuditStatus | string
): "default" | "warning" | "info" | "success" {
  switch (status) {
    case "planning":
      return "default";
    case "fieldwork":
      return "warning";
    case "reporting":
      return "info";
    case "closed":
      return "success";
    default:
      return "default";
  }
}

function outcomeVariant(
  outcome: AuditOutcome
): "success" | "warning" | "error" | "default" | "info" {
  switch (outcome) {
    case "passed":
      return "success";
    case "qualified":
      return "warning";
    case "adverse":
      return "error";
    case "disclaimer":
      return "info";
    default:
      return "default";
  }
}

function outcomeLabel(outcome: AuditOutcome): string {
  switch (outcome) {
    case "passed":
      return "Passed";
    case "qualified":
      return "Qualified";
    case "adverse":
      return "Adverse";
    case "disclaimer":
      return "Disclaimer";
    default:
      return "N/A";
  }
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
  const e = new Date(end).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
  return `${s} – ${e}`;
}

function nextStatus(current: AuditStatus): AuditStatus | null {
  switch (current) {
    case "planning":
      return "fieldwork";
    case "fieldwork":
      return "reporting";
    case "reporting":
      return "closed";
    default:
      return null;
  }
}

function nextStatusLabel(current: AuditStatus): string {
  switch (current) {
    case "planning":
      return "Move to Fieldwork";
    case "fieldwork":
      return "Move to Reporting";
    case "reporting":
      return "Close Audit";
    default:
      return "";
  }
}

export default function AuditCyclesPage() {
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Per-cycle UI state
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<AuditOutcome>(null);

  const [form, setForm] = useState<NewAuditForm>({
    frameworkName: FRAMEWORK_OPTIONS[0],
    auditType: "",
    periodStart: "",
    periodEnd: "",
    auditorName: "",
    auditorFirm: "",
    targetCloseDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModal]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/audit-cycles");
      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "PRO_REQUIRED") {
          setIsPro(false);
          return;
        }
      }
      if (!res.ok) throw new Error("Failed to fetch audit cycles");
      const json: AuditCyclesResponse = await res.json();
      setCycles(json.cycles);
    } catch (error) {
      logger.error("Failed to fetch audit cycles", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.auditType.trim() || !form.periodStart || !form.periodEnd) return;

    if (new Date(form.periodStart) > new Date(form.periodEnd)) {
      alert("Period start must be before period end.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/audit-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkName: form.frameworkName,
          auditType: form.auditType.trim(),
          status: "planning",
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          auditorName: form.auditorName.trim() || undefined,
          auditorFirm: form.auditorFirm.trim() || undefined,
          targetCloseDate: form.targetCloseDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create audit cycle");
      setForm({
        frameworkName: FRAMEWORK_OPTIONS[0],
        auditType: "",
        periodStart: "",
        periodEnd: "",
        auditorName: "",
        auditorFirm: "",
        targetCloseDate: "",
      });
      setShowModal(false);
      await fetchData();
    } catch (error) {
      logger.error("Failed to create audit cycle", error);
      alert("Failed to create audit cycle. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (cycle: AuditCycle) => {
    const next = nextStatus(cycle.status);
    if (!next) return;

    // If closing, open the outcome picker instead of immediately transitioning
    if (next === "closed") {
      setClosingId(cycle.id);
      setPendingOutcome(null);
      return;
    }

    setTransitioningId(cycle.id);
    try {
      const res = await fetch(`/api/audit-cycles/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchData();
    } catch (error) {
      logger.error("Failed to transition audit cycle", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setTransitioningId(null);
    }
  };

  const handleClose = async (cycleId: string) => {
    setTransitioningId(cycleId);
    try {
      const res = await fetch(`/api/audit-cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "closed",
          outcome: pendingOutcome || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to close audit");
      setClosingId(null);
      setPendingOutcome(null);
      await fetchData();
    } catch (error) {
      logger.error("Failed to close audit cycle", error);
      alert("Failed to close audit. Please try again.");
    } finally {
      setTransitioningId(null);
    }
  };

  // Derive active audit (first non-closed)
  const activeAudit = cycles.find((c) => c.status !== "closed");
  const activeCount = cycles.filter((c) => c.status !== "closed").length;
  const planningCount = cycles.filter((c) => c.status === "planning").length;
  const fieldworkCount = cycles.filter((c) => c.status === "fieldwork").length;

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
                Audit Cycles requires a Pro subscription
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Audit cycle management and finding tracking is a Pro feature.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading audit cycles…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Audit Cycles
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Manage your compliance audit lifecycle
            </p>
          </div>
          <Button variant="accent" onClick={() => setShowModal(true)}>
            Start New Audit
          </Button>
        </div>
      </FadeIn>

      {/* Active Audit Banner */}
      {activeAudit && (
        <FadeIn delay={0.05}>
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-semibold text-blue-800">Active Audit</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-700">
              <span className="font-medium">{activeAudit.frameworkName}</span>
              <Badge variant={auditStatusVariant(activeAudit.status)} size="sm">
                {activeAudit.status.charAt(0).toUpperCase() + activeAudit.status.slice(1)}
              </Badge>
              {activeAudit.targetCloseDate && (
                <span className="text-blue-600">
                  Target close:{" "}
                  {new Date(activeAudit.targetCloseDate).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <Link
              href={`/audits/${activeAudit.id}`}
              className="sm:ml-auto text-sm font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2"
            >
              View Details
            </Link>
          </div>
        </FadeIn>
      )}

      {/* Stats */}
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <AuditStatCard
            label="Total"
            count={cycles.length}
            color="border-gray-200 bg-white text-gray-900"
          />
          <AuditStatCard
            label="Active"
            count={activeCount}
            color="border-accent/30 bg-accent-light/40 text-accent"
          />
          <AuditStatCard
            label="Planning"
            count={planningCount}
            color="border-blue-200 bg-blue-50 text-blue-700"
          />
          <AuditStatCard
            label="Fieldwork"
            count={fieldworkCount}
            color="border-yellow-200 bg-yellow-50 text-yellow-700"
          />
        </div>
      </FadeIn>

      {/* Audit Cycles List */}
      <FadeIn delay={0.12}>
        {cycles.length === 0 ? (
          <Card variant="elevated">
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No audit cycles yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Create your first audit cycle to track an engagement.
              </p>
              <Button variant="accent" onClick={() => setShowModal(true)}>
                Start New Audit
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle, i) => {
              const isTransitioning = transitioningId === cycle.id;
              const isClosing = closingId === cycle.id;
              const next = nextStatus(cycle.status);

              return (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    variant="elevated"
                    className="hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Top row: info + view details */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant={auditStatusVariant(cycle.status)} dot>
                              {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                            </Badge>
                            {cycle.outcome && (
                              <Badge variant={outcomeVariant(cycle.outcome)}>
                                {outcomeLabel(cycle.outcome)}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {cycle.frameworkName}{" "}
                            <span className="font-normal text-gray-500">, {cycle.auditType}</span>
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                            <span>
                              <CalendarIcon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                              {formatDateRange(cycle.periodStart, cycle.periodEnd)}
                            </span>
                            {cycle.auditorFirm && (
                              <span>
                                <BuildingIcon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                                {cycle.auditorFirm}
                              </span>
                            )}
                            {cycle.auditorName && !cycle.auditorFirm && (
                              <span>
                                <UserIcon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                                {cycle.auditorName}
                              </span>
                            )}
                            {cycle.targetCloseDate && (
                              <span>
                                Target close:{" "}
                                {new Date(cycle.targetCloseDate).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            <span>
                              <span className="font-medium text-gray-700">
                                {cycle._count.findings}
                              </span>{" "}
                              finding{cycle._count.findings !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Right: view details */}
                        <div className="shrink-0">
                          <Link
                            href={`/audits/${cycle.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            View Details
                            <ArrowIcon className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Bottom row: status transition actions (only for active audits) */}
                      {cycle.status !== "closed" && next && (
                        <div className="border-t border-gray-100 pt-3">
                          {isClosing ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <label className="text-sm font-medium text-gray-700 shrink-0">
                                Outcome:
                              </label>
                              <select
                                value={pendingOutcome ?? ""}
                                onChange={(e) =>
                                  setPendingOutcome((e.target.value as AuditOutcome) || null)
                                }
                                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                              >
                                <option value="">Select outcome (optional)</option>
                                <option value="passed">Passed</option>
                                <option value="qualified">Qualified</option>
                                <option value="adverse">Adverse</option>
                                <option value="disclaimer">Disclaimer</option>
                              </select>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  variant="accent"
                                  loading={isTransitioning}
                                  disabled={isTransitioning}
                                  onClick={() => handleClose(cycle.id)}
                                >
                                  {isTransitioning ? "Closing…" : "Confirm Close"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  disabled={isTransitioning}
                                  onClick={() => {
                                    setClosingId(null);
                                    setPendingOutcome(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              loading={isTransitioning}
                              disabled={isTransitioning}
                              onClick={() => handleStatusTransition(cycle)}
                            >
                              {isTransitioning ? "Updating…" : nextStatusLabel(cycle.status)}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Start New Audit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => !submitting && setShowModal(false)}
            />

            {/* Dialog */}
            <motion.div
              key="modal-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Start New Audit</h2>
                  <button
                    onClick={() => !submitting && setShowModal(false)}
                    disabled={submitting}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal body */}
                <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
                  <form id="new-audit-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Framework Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Framework Name <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.frameworkName}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, frameworkName: e.target.value }))
                          }
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        >
                          {FRAMEWORK_OPTIONS.map((fw) => (
                            <option key={fw} value={fw}>
                              {fw}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Audit Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Audit Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.auditType}
                          onChange={(e) => setForm((f) => ({ ...f, auditType: e.target.value }))}
                          required
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        >
                          <option value="">Select type…</option>
                          {AUDIT_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Period Start */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Period Start <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={form.periodStart}
                          onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                          required
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        />
                      </div>

                      {/* Period End */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Period End <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={form.periodEnd}
                          onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                          required
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        />
                      </div>

                      {/* Auditor Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Auditor Name <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={form.auditorName}
                          onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                          placeholder="e.g. Jane Smith"
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        />
                      </div>

                      {/* Auditor Firm */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Auditor Firm <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={form.auditorFirm}
                          onChange={(e) => setForm((f) => ({ ...f, auditorFirm: e.target.value }))}
                          placeholder="e.g. Deloitte"
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        />
                      </div>

                      {/* Target Close Date */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Target Close Date{" "}
                          <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="date"
                          value={form.targetCloseDate}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, targetCloseDate: e.target.value }))
                          }
                          className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all sm:max-w-xs"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="new-audit-form"
                    variant="accent"
                    loading={submitting}
                    disabled={submitting}
                  >
                    {submitting ? "Creating…" : "Create Audit Cycle"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuditStatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn("rounded-xl border shadow-sm p-4 flex flex-col", color)}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-sm mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
