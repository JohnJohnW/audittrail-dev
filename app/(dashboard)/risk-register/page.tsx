"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  "ISO 27001",
  "SOC 2",
  "Essential Eight",
  "NIST CSF",
  "NIST SP 800-53",
  "PCI DSS",
];

const TREATMENT_TYPE_OPTIONS = ["remediate", "accept", "transfer", "avoid"] as const;
type TreatmentType = (typeof TREATMENT_TYPE_OPTIONS)[number];

const STATUS_FILTERS = ["All", "Open", "In Progress", "Overdue", "Closed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// ─── Types ───────────────────────────────────────────────────────────────────

interface OwnerRef {
  id: string;
  name: string | null;
  email: string;
}

interface RiskTreatment {
  id: string;
  controlCode: string;
  frameworkName: string;
  treatmentType: string;
  status: string;
  rationale: string;
  ownerId: string | null;
  owner: OwnerRef | null;
  reviewDate: string | null;
  linkedGithubIssue: string | null;
  createdAt: string;
}

interface NewTreatmentForm {
  controlCode: string;
  frameworkName: string;
  treatmentType: TreatmentType;
  rationale: string;
  owner: string;
  reviewDate: string;
  linkedGithubIssue: string;
}

const EMPTY_FORM: NewTreatmentForm = {
  controlCode: "",
  frameworkName: FRAMEWORK_OPTIONS[0],
  treatmentType: "remediate",
  rationale: "",
  owner: "",
  reviewDate: "",
  linkedGithubIssue: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOverdue(t: RiskTreatment): boolean {
  if (!t.reviewDate) return false;
  return t.status !== "closed" && new Date(t.reviewDate) < new Date();
}

function effectiveStatus(t: RiskTreatment): string {
  if (isOverdue(t)) return "overdue";
  return t.status;
}

function statusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "open":
      return "warning";
    case "in_progress":
      return "info";
    case "overdue":
      return "error";
    case "closed":
      return "success";
    default:
      return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "overdue":
      return "Overdue";
    case "closed":
      return "Closed";
    case "open":
      return "Open";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function treatmentTypeLabel(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
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

function ownerDisplay(t: RiskTreatment): string {
  if (t.owner) {
    return t.owner.name || t.owner.email;
  }
  return "N/A";
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RiskRegisterPage() {
  const [treatments, setTreatments] = useState<RiskTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [form, setForm] = useState<NewTreatmentForm>(EMPTY_FORM);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/risk-treatments");
      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "PRO_REQUIRED") {
          setIsPro(false);
          return;
        }
      }
      if (!res.ok) throw new Error("Failed to fetch risk treatments");
      const json = await res.json();
      setTreatments(json.treatments ?? []);
    } catch (error) {
      logger.error("Failed to fetch risk treatments", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.controlCode.trim() || !form.rationale.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/risk-treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlCode: form.controlCode.trim(),
          frameworkName: form.frameworkName,
          treatmentType: form.treatmentType,
          rationale: form.rationale.trim(),
          owner: form.owner.trim() || undefined,
          reviewDate: form.reviewDate || undefined,
          linkedGithubIssue: form.linkedGithubIssue.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create treatment");
      setForm(EMPTY_FORM);
      setShowModal(false);
      await fetchData();
    } catch (error) {
      logger.error("Failed to create risk treatment", error);
      alert("Failed to create treatment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const markClosed = async (id: string) => {
    setClosingId(id);
    try {
      const res = await fetch(`/api/risk-treatments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!res.ok) throw new Error("Failed to update treatment");
      await fetchData();
    } catch (error) {
      logger.error("Failed to mark treatment closed", error);
      alert("Failed to update treatment. Please try again.");
    } finally {
      setClosingId(null);
    }
  };

  const deleteTreatment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this treatment?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/risk-treatments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete treatment");
      await fetchData();
    } catch (error) {
      logger.error("Failed to delete risk treatment", error);
      alert("Failed to delete treatment. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Counts based on effective status (incorporating overdue logic)
  const counts = {
    open: treatments.filter((t) => effectiveStatus(t) === "open").length,
    overdue: treatments.filter((t) => effectiveStatus(t) === "overdue").length,
    in_progress: treatments.filter((t) => effectiveStatus(t) === "in_progress").length,
    closed: treatments.filter((t) => t.status === "closed").length,
  };

  const filteredTreatments = treatments.filter((t) => {
    if (statusFilter === "All") return true;
    const eff = effectiveStatus(t);
    switch (statusFilter) {
      case "Open":
        return eff === "open";
      case "In Progress":
        return eff === "in_progress";
      case "Overdue":
        return eff === "overdue";
      case "Closed":
        return t.status === "closed";
    }
  });

  // ─── Pro gate ─────────────────────────────────────────────────────────────

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <WarningIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-semibold text-yellow-800">
                Risk Register requires a Pro subscription
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Risk register and treatment tracking is a Pro feature.
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

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading risk register…</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              Risk Register
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Track and manage compliance gap treatments
            </p>
          </div>
          <Button variant="accent" onClick={() => setShowModal(true)}>
            + Add Risk Treatment
          </Button>
        </div>
      </FadeIn>

      {/* Stats row */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Total Open"
            count={counts.open + counts.in_progress}
            colorClass="border-gray-200 bg-white text-gray-900"
          />
          <StatCard
            label="Overdue"
            count={counts.overdue}
            colorClass="border-red-200 bg-red-50 text-red-700"
          />
          <StatCard
            label="In Progress"
            count={counts.in_progress}
            colorClass="border-yellow-200 bg-yellow-50 text-yellow-700"
          />
          <StatCard
            label="Closed"
            count={counts.closed}
            colorClass="border-green-200 bg-green-50 text-green-700"
          />
        </div>
      </FadeIn>

      {/* Status filter tabs */}
      <FadeIn delay={0.08}>
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                statusFilter === f
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Table */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" padding="none">
          {filteredTreatments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No risk treatments yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Add your first treatment to start tracking compliance gaps.
              </p>
              <Button variant="accent" onClick={() => setShowModal(true)}>
                Add Treatment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Control
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Framework
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Treatment Type
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Owner
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Due Date
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTreatments.map((t, i) => {
                    const eff = effectiveStatus(t);
                    const overdue = eff === "overdue";
                    return (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        {/* Control */}
                        <td className="px-5 py-3">
                          <div className="font-mono text-xs font-semibold text-gray-900">
                            {t.controlCode}
                          </div>
                          {t.linkedGithubIssue && (
                            <a
                              href={t.linkedGithubIssue}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline mt-0.5 inline-block truncate max-w-[140px]"
                              title={t.linkedGithubIssue}
                            >
                              GitHub issue
                            </a>
                          )}
                        </td>

                        {/* Framework */}
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                              frameworkBadgeColor(t.frameworkName)
                            )}
                          >
                            {t.frameworkName}
                          </span>
                        </td>

                        {/* Treatment Type */}
                        <td className="px-5 py-3 capitalize text-gray-700">
                          {treatmentTypeLabel(t.treatmentType)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <Badge variant={statusVariant(eff)} dot>
                            {statusLabel(eff)}
                          </Badge>
                        </td>

                        {/* Owner */}
                        <td className="px-5 py-3 text-gray-600 text-xs">{ownerDisplay(t)}</td>

                        {/* Due Date */}
                        <td
                          className={cn(
                            "px-5 py-3 text-sm whitespace-nowrap",
                            overdue ? "text-red-600 font-medium" : "text-gray-600"
                          )}
                        >
                          {t.reviewDate ? new Date(t.reviewDate).toLocaleDateString() : "N/A"}
                          {overdue && <span className="ml-1 text-xs text-red-400">(overdue)</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {t.status !== "closed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={closingId === t.id}
                                disabled={closingId === t.id || deletingId === t.id}
                                onClick={() => markClosed(t.id)}
                              >
                                Close
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={deletingId === t.id}
                              disabled={closingId === t.id || deletingId === t.id}
                              onClick={() => deleteTreatment(t.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Add Treatment Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => !submitting && setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Add Risk Treatment</h2>
                  <button
                    onClick={() => !submitting && setShowModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                  >
                    <XIcon />
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  className="p-6 space-y-4 overflow-y-auto max-h-[75vh]"
                >
                  {/* Row 1: Control Code + Framework */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Control Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.controlCode}
                        onChange={(e) => setForm((f) => ({ ...f, controlCode: e.target.value }))}
                        placeholder="e.g. A.5.1"
                        required
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Framework <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.frameworkName}
                        onChange={(e) => setForm((f) => ({ ...f, frameworkName: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      >
                        {FRAMEWORK_OPTIONS.map((fw) => (
                          <option key={fw} value={fw}>
                            {fw}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Treatment Type + Owner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Treatment Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.treatmentType}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, treatmentType: e.target.value as TreatmentType }))
                        }
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      >
                        {TREATMENT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {treatmentTypeLabel(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Owner <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.owner}
                        onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                        placeholder="Email or name"
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Rationale */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Rationale <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.rationale}
                      onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
                      placeholder="Describe the rationale for this treatment decision…"
                      rows={3}
                      required
                      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                    />
                  </div>

                  {/* Row 3: Review Date + GitHub Issue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Review Date{" "}
                        <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={form.reviewDate}
                        onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Linked GitHub Issue URL{" "}
                        <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={form.linkedGithubIssue}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, linkedGithubIssue: e.target.value }))
                        }
                        placeholder="https://github.com/…"
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="accent"
                      loading={submitting}
                      disabled={submitting}
                    >
                      {submitting ? "Creating…" : "Create Treatment"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowModal(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={cn("rounded-xl border shadow-sm p-4 flex flex-col", colorClass)}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-sm mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

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

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
