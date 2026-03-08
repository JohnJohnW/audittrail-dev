"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface ComplianceAlert {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  readAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const SEVERITY_STYLES: Record<
  string,
  { badge: "default" | "info" | "warning" | "error" | "success"; dot: string; label: string }
> = {
  critical: { badge: "error", dot: "bg-red-500", label: "Critical" },
  high: { badge: "error", dot: "bg-orange-500", label: "High" },
  medium: { badge: "warning", dot: "bg-amber-500", label: "Medium" },
  low: { badge: "info", dot: "bg-blue-500", label: "Low" },
};

const TYPE_LABELS: Record<string, string> = {
  score_drop: "Score Drop",
  control_regression: "Control Regression",
  branch_protection_weakened: "Branch Protection",
  pr_no_review: "PR Without Review",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsPanel({ isOpen, onClose, onUnreadCountChange }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "active" ? "?resolved=false" : "";
      const res = await fetch(`/api/alerts${query}`);
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      onUnreadCountChange?.(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) fetchAlerts();
  }, [isOpen, fetchAlerts]);

  const handleAction = async (id: string, action: "read" | "resolve") => {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    fetchAlerts();
  };

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.readAt);
    await Promise.all(unread.map((a) => handleAction(a.id, "read")));
  };

  const unreadCount = alerts.filter((a) => !a.readAt && !a.resolvedAt).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col border-l border-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Compliance Alerts</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-accent hover:text-accent-hover font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Close alerts"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b border-gray-100">
              {(["active", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors",
                    filter === f
                      ? "text-accent border-b-2 border-accent"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {f === "active" ? "Active" : "All"}
                </button>
              ))}
            </div>

            {/* Alert list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    No alerts — your compliance posture looks stable
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {alerts.map((alert) => {
                    const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.medium;
                    const isUnread = !alert.readAt && !alert.resolvedAt;
                    const isResolved = !!alert.resolvedAt;

                    return (
                      <li
                        key={alert.id}
                        className={cn(
                          "px-5 py-4 transition-colors",
                          isUnread ? "bg-gray-50/70" : "bg-white",
                          isResolved && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Severity dot */}
                          <div className="mt-1.5 shrink-0">
                            <span className={cn("w-2 h-2 rounded-full block", styles.dot)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <Badge variant={styles.badge} className="text-xs py-0 px-1.5">
                                {styles.label}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {TYPE_LABELS[alert.type] ?? alert.type}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {timeAgo(alert.createdAt)}
                              </span>
                            </div>

                            <p className="text-sm font-medium text-gray-800 leading-snug mb-1">
                              {alert.title}
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              {alert.description}
                            </p>

                            {/* Actions */}
                            {!isResolved && (
                              <div className="flex items-center gap-3 mt-2">
                                {isUnread && (
                                  <button
                                    onClick={() => handleAction(alert.id, "read")}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    Mark read
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(alert.id, "resolve")}
                                  className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                                >
                                  Resolve
                                </button>
                              </div>
                            )}
                            {isResolved && (
                              <p className="text-xs text-green-600 mt-1 font-medium">Resolved</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Alerts are generated automatically after each sync
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Bell icon with unread dot for use in the nav */
export function AlertBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label={`${unreadCount} unread compliance alerts`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"
        />
      )}
    </button>
  );
}
