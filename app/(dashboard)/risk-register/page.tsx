"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const FRAMEWORK_OPTIONS = [
  "ISO 27001",
  "SOC 2",
  "Essential Eight",
  "NIST CSF",
  "NIST SP 800-53",
  "GDPR",
  "SOCI Act",
  "PCI DSS",
];

const TREATMENT_TYPE_OPTIONS = ["remediate", "accept", "transfer", "avoid"];

interface RiskTreatment {
  id: string;
  controlCode: string;
  frameworkName: string;
  treatmentType: string;
  status: string;
  rationale: string;
  ownerId: string | null;
  reviewDate: string | null;
  linkedGithubIssue: string | null;
  createdAt: string;
}

interface RiskTreatmentsResponse {
  treatments: RiskTreatment[];
  total: number;
}

interface NewTreatmentForm {
  controlCode: string;
  frameworkName: string;
  treatmentType: string;
  rationale: string;
  reviewDate: string;
}

const STATUS_ORDER = ["open", "in_progress", "overdue", "closed"];

function statusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status.toLowerCase()) {
    case "open":
      return "info";
    case "in_progress":
      return "warning";
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
    GDPR: "bg-green-50 text-green-700 border-green-200",
    "SOCI Act": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "PCI DSS": "bg-red-50 text-red-700 border-red-200",
  };
  return map[framework] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function isOverdue(treatment: RiskTreatment): boolean {
  if (!treatment.reviewDate) return false;
  return treatment.status !== "closed" && new Date(treatment.reviewDate) < new Date();
}

export default function RiskRegisterPage() {
  const [treatments, setTreatments] = useState<RiskTreatment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [form, setForm] = useState<NewTreatmentForm>({
    controlCode: "",
    frameworkName: FRAMEWORK_OPTIONS[0],
    treatmentType: TREATMENT_TYPE_OPTIONS[0],
    rationale: "",
    reviewDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      const json: RiskTreatmentsResponse = await res.json();
      setTreatments(json.treatments);
      setTotal(json.total);
    } catch (error) {
      logger.error("Failed to fetch risk treatments", error);
    } finally {
      setLoading(false);
    }
  };

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
          reviewDate: form.reviewDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create treatment");
      setForm({
        controlCode: "",
        frameworkName: FRAMEWORK_OPTIONS[0],
        treatmentType: TREATMENT_TYPE_OPTIONS[0],
        rationale: "",
        reviewDate: "",
      });
      setShowForm(false);
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

  const counts = {
    open: treatments.filter((t) => t.status === "open").length,
    in_progress: treatments.filter((t) => t.status === "in_progress").length,
    closed: treatments.filter((t) => t.status === "closed").length,
    overdue: treatments.filter((t) => isOverdue(t)).length,
  };

  const grouped = STATUS_ORDER.reduce<Record<string, RiskTreatment[]>>((acc, status) => {
    const group = treatments.filter((t) => t.status === status);
    if (group.length > 0) acc[status] = group;
    return acc;
  }, {});

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
              Track risk treatments and acceptance decisions
            </p>
          </div>
          <Button variant="accent" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Treatment"}
          </Button>
        </div>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <RiskStatPill
            label="Total"
            count={total}
            color="border-gray-200 bg-white text-gray-900"
          />
          <RiskStatPill
            label="Open"
            count={counts.open}
            color="border-blue-200 bg-blue-50 text-blue-700"
          />
          <RiskStatPill
            label="In Progress"
            count={counts.in_progress}
            color="border-yellow-200 bg-yellow-50 text-yellow-700"
          />
          <RiskStatPill
            label="Overdue"
            count={counts.overdue}
            color="border-red-200 bg-red-50 text-red-700"
          />
        </div>
      </FadeIn>

      {/* Add Treatment Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>New Risk Treatment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Control Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.controlCode}
                        onChange={(e) => setForm((f) => ({ ...f, controlCode: e.target.value }))}
                        placeholder="e.g. A.9.1.1"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Treatment Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.treatmentType}
                        onChange={(e) => setForm((f) => ({ ...f, treatmentType: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      >
                        {TREATMENT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Review Date (optional)
                      </label>
                      <input
                        type="date"
                        value={form.reviewDate}
                        onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>
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
                  <div className="flex gap-3">
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
                      onClick={() => setShowForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Treatments Table */}
      <FadeIn delay={0.1}>
        {treatments.length === 0 ? (
          <Card variant="elevated">
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No risk treatments yet</p>
              <p className="text-sm text-gray-500">
                Add your first treatment to start tracking risk decisions.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([status, items]) => (
              <Card key={status} variant="elevated" padding="none">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  <Badge variant={statusVariant(status)} dot>
                    {statusLabel(status)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {items.length} treatment{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 font-medium text-gray-600">Control</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-600">Framework</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-600">
                          Review Date
                        </th>
                        <th className="text-left px-6 py-3 font-medium text-gray-600">Rationale</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((treatment, i) => {
                        const overdue = isOverdue(treatment);
                        return (
                          <motion.tr
                            key={treatment.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-6 py-3 font-mono text-xs font-medium text-gray-900">
                              {treatment.controlCode}
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={cn(
                                  "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border",
                                  frameworkBadgeColor(treatment.frameworkName)
                                )}
                              >
                                {treatment.frameworkName}
                              </span>
                            </td>
                            <td className="px-6 py-3 capitalize text-gray-700">
                              {treatment.treatmentType}
                            </td>
                            <td
                              className={cn(
                                "px-6 py-3 text-sm",
                                overdue ? "text-red-600 font-medium" : "text-gray-700"
                              )}
                            >
                              {treatment.reviewDate
                                ? new Date(treatment.reviewDate).toLocaleDateString()
                                : "-"}
                              {overdue && (
                                <span className="ml-1 text-xs text-red-500">(overdue)</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-gray-600 max-w-xs">
                              <p className="truncate" title={treatment.rationale}>
                                {treatment.rationale}
                              </p>
                            </td>
                            <td className="px-6 py-3">
                              {treatment.status !== "closed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={closingId === treatment.id}
                                  disabled={closingId === treatment.id}
                                  onClick={() => markClosed(treatment.id)}
                                >
                                  Mark Closed
                                </Button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}

function RiskStatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn("rounded-xl border shadow-sm p-4 flex flex-col", color)}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-sm mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

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
