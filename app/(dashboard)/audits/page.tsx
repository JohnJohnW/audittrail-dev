"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { FadeIn } from "@/components/ui/Motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

type AuditStatus = "planning" | "fieldwork" | "reporting" | "closed";

interface AuditCycle {
  id: string;
  frameworkName: string;
  auditType: string;
  status: AuditStatus;
  periodStart: string;
  periodEnd: string;
  auditorName: string | null;
  targetCloseDate: string | null;
  _count: { findings: number };
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
  targetCloseDate: string;
}

function auditStatusColor(status: AuditStatus | string): string {
  switch (status) {
    case "planning":
      return "bg-blue-100 text-blue-700";
    case "fieldwork":
      return "bg-yellow-100 text-yellow-700";
    case "reporting":
      return "bg-orange-100 text-orange-700";
    case "closed":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
  const e = new Date(end).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

export default function AuditCyclesPage() {
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<NewAuditForm>({
    frameworkName: FRAMEWORK_OPTIONS[0],
    auditType: "",
    periodStart: "",
    periodEnd: "",
    auditorName: "",
    targetCloseDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

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
        targetCloseDate: "",
      });
      setShowForm(false);
      await fetchData();
    } catch (error) {
      logger.error("Failed to create audit cycle", error);
      alert("Failed to create audit cycle. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = cycles.filter((c) => c.status !== "closed").length;
  const _closedCount = cycles.filter((c) => c.status === "closed").length;
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
              Manage audit engagements and findings
            </p>
          </div>
          <Button variant="accent" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New Audit Cycle"}
          </Button>
        </div>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={0.05}>
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

      {/* New Audit Cycle Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="new-audit-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>New Audit Cycle</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        Audit Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.auditType}
                        onChange={(e) => setForm((f) => ({ ...f, auditType: e.target.value }))}
                        placeholder="e.g. SOC 2 Type II"
                        required
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Auditor Name (optional)
                      </label>
                      <input
                        type="text"
                        value={form.auditorName}
                        onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                        placeholder="e.g. Deloitte"
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Target Close Date (optional)
                      </label>
                      <input
                        type="date"
                        value={form.targetCloseDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, targetCloseDate: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="submit"
                      variant="accent"
                      loading={submitting}
                      disabled={submitting}
                    >
                      {submitting ? "Creating…" : "Create Audit Cycle"}
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

      {/* Audit Cycles List */}
      <FadeIn delay={0.1}>
        {cycles.length === 0 ? (
          <Card variant="elevated">
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No audit cycles yet</p>
              <p className="text-sm text-gray-500">
                Create your first audit cycle to track an engagement.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle, i) => (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card variant="elevated" className="hover:shadow-lg transition-shadow duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
                            auditStatusColor(cycle.status)
                          )}
                        >
                          {cycle.status}
                        </span>
                        <span className="text-xs text-gray-400">{cycle.frameworkName}</span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {cycle.auditType}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>
                          <CalendarIcon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                          {formatDateRange(cycle.periodStart, cycle.periodEnd)}
                        </span>
                        {cycle.auditorName && (
                          <span>
                            <UserIcon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                            {cycle.auditorName}
                          </span>
                        )}
                        {cycle.targetCloseDate && (
                          <span>
                            Target close: {new Date(cycle.targetCloseDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          <span className="font-medium text-gray-700">{cycle._count.findings}</span>{" "}
                          finding{cycle._count.findings !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Right: action */}
                    <div className="shrink-0">
                      <Link
                        href={`/audits/${cycle.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        View
                        <ArrowIcon className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </FadeIn>
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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
