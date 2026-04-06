"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/Motion";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["All", "Pending", "In Progress", "Complete", "Overdue"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FRAMEWORK_OPTIONS = [
  "All Frameworks",
  "SOC 2",
  "ISO 27001",
  "Essential Eight",
  "NIST CSF",
  "NIST SP 800-53",
  "PCI DSS",
];

const TASK_TYPE_LABELS: Record<string, string> = {
  access_review: "Access Review",
  vendor_assessment: "Vendor Assessment",
  training: "Training",
  policy_approval: "Policy Approval",
  board_review: "Board Review",
  dr_test: "DR Test",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface AssignedUser {
  id: string;
  name: string | null;
  email: string;
}

interface HumanTask {
  id: string;
  controlCode: string;
  controlName: string;
  frameworkName: string;
  taskType: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  evidenceUrl: string | null;
  completedAt: string | null;
  assignedToId: string | null;
  assignedTo: AssignedUser | null;
  template: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isOverdue(task: HumanTask): boolean {
  if (!task.dueDate) return false;
  return task.status !== "complete" && new Date(task.dueDate) < new Date();
}

function effectiveStatus(task: HumanTask): string {
  if (isOverdue(task)) return "overdue";
  return task.status;
}

function statusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "pending":
      return "warning";
    case "in_progress":
      return "info";
    case "complete":
      return "success";
    case "overdue":
      return "error";
    default:
      return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "complete":
      return "Complete";
    case "overdue":
      return "Overdue";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function taskTypeLabel(type: string): string {
  return TASK_TYPE_LABELS[type] ?? type;
}

function taskTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    access_review: "bg-indigo-50 text-indigo-700 border-indigo-200",
    vendor_assessment: "bg-amber-50 text-amber-700 border-amber-200",
    training: "bg-emerald-50 text-emerald-700 border-emerald-200",
    policy_approval: "bg-violet-50 text-violet-700 border-violet-200",
    board_review: "bg-rose-50 text-rose-700 border-rose-200",
    dr_test: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };
  return map[type] ?? "bg-gray-100 text-gray-700 border-gray-200";
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function assigneeDisplay(task: HumanTask): string {
  if (task.assignedTo) {
    return task.assignedTo.name || task.assignedTo.email;
  }
  return "Unassigned";
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [frameworkFilter, setFrameworkFilter] = useState("All Frameworks");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [evidenceInputs, setEvidenceInputs] = useState<Record<string, string>>({});

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (statusFilter !== "All") {
        const statusMap: Record<string, string> = {
          Pending: "pending",
          "In Progress": "in_progress",
          Complete: "complete",
          Overdue: "overdue",
        };
        const mapped = statusMap[statusFilter];
        if (mapped) params.set("status", mapped);
      }

      if (frameworkFilter !== "All Frameworks") {
        params.set("framework", frameworkFilter);
      }

      const res = await fetch(`/api/agent/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch (error) {
      logger.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, frameworkFilter]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const updateTask = async (
    taskId: string,
    updates: { status?: string; evidenceUrl?: string | null }
  ) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/agent/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await fetchTasks();
    } catch (error) {
      logger.error("Failed to update task", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    const evidenceUrl = evidenceInputs[taskId]?.trim() || undefined;
    await updateTask(taskId, {
      status: "complete",
      ...(evidenceUrl ? { evidenceUrl } : {}),
    });
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus });
  };

  // Compute counts for stat badges
  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => effectiveStatus(t) === "pending").length,
    in_progress: tasks.filter((t) => effectiveStatus(t) === "in_progress").length,
    complete: tasks.filter((t) => t.status === "complete").length,
    overdue: tasks.filter((t) => effectiveStatus(t) === "overdue").length,
  };

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-500">Loading tasks...</p>
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
            Human Tasks
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Controls that require human action. Complete these tasks to maintain compliance.
          </p>
        </div>
      </FadeIn>

      {/* Stats row */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <MiniStat
            label="Total"
            count={counts.total}
            className="border-gray-200 bg-white text-gray-900"
          />
          <MiniStat
            label="Pending"
            count={counts.pending}
            className="border-yellow-200 bg-yellow-50 text-yellow-700"
          />
          <MiniStat
            label="In Progress"
            count={counts.in_progress}
            className="border-blue-200 bg-blue-50 text-blue-700"
          />
          <MiniStat
            label="Complete"
            count={counts.complete}
            className="border-green-200 bg-green-50 text-green-700"
          />
          <MiniStat
            label="Overdue"
            count={counts.overdue}
            className="border-red-200 bg-red-50 text-red-700"
          />
        </div>
      </FadeIn>

      {/* Filter bar */}
      <FadeIn delay={0.08}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
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

          {/* Framework dropdown */}
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all"
          >
            {FRAMEWORK_OPTIONS.map((fw) => (
              <option key={fw} value={fw}>
                {fw}
              </option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* Task list */}
      <FadeIn delay={0.1}>
        <Card variant="elevated" padding="none">
          {tasks.length === 0 ? (
            <div className="p-12 text-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-1">No tasks found</p>
              <p className="text-sm text-gray-500">
                {statusFilter !== "All" || frameworkFilter !== "All Frameworks"
                  ? "Try adjusting your filters to see more tasks."
                  : "Human tasks will appear here when the compliance agent identifies controls that require manual action."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tasks.map((task, i) => {
                const eff = effectiveStatus(task);
                const overdue = eff === "overdue";
                const isExpanded = expandedTaskId === task.id;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {/* Task row */}
                    <div
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className={cn(
                        "px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer",
                        isExpanded && "bg-gray-50/40"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Left: title and badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {task.title}
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
                            {/* Control code */}
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                              {task.controlCode}
                            </span>
                            {/* Framework badge */}
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                                frameworkBadgeColor(task.frameworkName)
                              )}
                            >
                              {task.frameworkName}
                            </span>
                            {/* Task type badge */}
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                                taskTypeBadgeColor(task.taskType)
                              )}
                            >
                              {taskTypeLabel(task.taskType)}
                            </span>
                          </div>
                        </div>

                        {/* Right: status, due date, assignee */}
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={statusVariant(eff)} dot>
                            {statusLabel(eff)}
                          </Badge>
                          <span
                            className={cn(
                              "text-xs whitespace-nowrap",
                              overdue ? "text-red-600 font-medium" : "text-gray-500"
                            )}
                          >
                            {overdue ? "Overdue" : formatDate(task.dueDate)}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
                            {assigneeDisplay(task)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50/30">
                            <div className="pt-4 space-y-4">
                              {/* Description */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                  Description
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {task.description}
                                </p>
                              </div>

                              {/* Template content */}
                              {task.template && Object.keys(task.template).length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Template
                                  </h4>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                      {JSON.stringify(task.template, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Details grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-xs text-gray-500 block">Assigned To</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {assigneeDisplay(task)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Due Date</span>
                                  <span
                                    className={cn(
                                      "text-sm font-medium",
                                      overdue ? "text-red-600" : "text-gray-900"
                                    )}
                                  >
                                    {formatDate(task.dueDate)}
                                    {overdue && " (Overdue)"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Control</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {task.controlName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Created</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {new Date(task.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              {/* Evidence URL (if already set) */}
                              {task.evidenceUrl && (
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1">Evidence</span>
                                  <a
                                    href={task.evidenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-accent hover:underline break-all"
                                  >
                                    {task.evidenceUrl}
                                  </a>
                                </div>
                              )}

                              {/* Actions (only show for incomplete tasks) */}
                              {task.status !== "complete" && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                                  {/* Evidence upload input */}
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      Evidence URL
                                    </label>
                                    <input
                                      type="url"
                                      placeholder="https://drive.google.com/... or file path"
                                      value={evidenceInputs[task.id] ?? ""}
                                      onChange={(e) =>
                                        setEvidenceInputs((prev) => ({
                                          ...prev,
                                          [task.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all"
                                    />
                                  </div>

                                  {/* Status change dropdown */}
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      Change Status
                                    </label>
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                      disabled={updatingTaskId === task.id}
                                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent hover:border-gray-400 transition-all disabled:opacity-50"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="complete">Complete</option>
                                    </select>
                                  </div>

                                  {/* Mark complete button */}
                                  <div className="flex items-end">
                                    <Button
                                      variant="accent"
                                      size="md"
                                      loading={updatingTaskId === task.id}
                                      disabled={updatingTaskId === task.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkComplete(task.id);
                                      }}
                                    >
                                      Mark Complete
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Completed state */}
                              {task.status === "complete" && task.completedAt && (
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                  <svg
                                    className="w-4 h-4 text-green-500"
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
                                  <span className="text-sm text-green-700 font-medium">
                                    Completed on{" "}
                                    {new Date(task.completedAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MiniStat({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3 sm:p-4 text-center", className)}>
      <p className="text-xl sm:text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
    </div>
  );
}
