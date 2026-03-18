"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ShareableReport {
  id: string;
  token: string;
  title: string;
  createdAt: string;
}

export function ShareReportButton() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ShareableReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/shareable");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load reports");
        return;
      }
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchReports();
  };

  const createLink = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/shareable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create link");
        return;
      }
      await fetchReports();
    } catch {
      setError("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const revokeLink = async (id: string) => {
    try {
      await fetch(`/api/reports/shareable?id=${id}`, { method: "DELETE" });
      await fetchReports();
    } catch {
      setError("Failed to revoke link");
    }
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/report/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latestReport = reports[0];

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Share Compliance Report</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {error && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm border ${
                  error.includes("Pro feature") || error.includes("Upgrade")
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {error}
                {(error.includes("Pro feature") || error.includes("Upgrade")) && (
                  <>
                    {" "}
                    <Link
                      href="/settings"
                      className="font-medium underline underline-offset-2 hover:opacity-80"
                      onClick={() => setOpen(false)}
                    >
                      Upgrade in Settings →
                    </Link>
                  </>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
              </div>
            ) : latestReport ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Share this read-only link with auditors or stakeholders. No account required.
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
                  <span className="text-xs text-gray-600 truncate flex-1">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/report/${latestReport.token}`
                      : `/report/${latestReport.token}`}
                  </span>
                  <button
                    onClick={() => copyLink(latestReport.token)}
                    className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created {new Date(latestReport.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => revokeLink(latestReport.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    Revoke link
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={createLink}
                    disabled={creating}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    {creating ? "Generating…" : "Generate new link (revokes current)"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-5">
                  Generate a read-only link to share your compliance report with auditors or
                  stakeholders. No Vigil account required.
                </p>
                <button
                  onClick={createLink}
                  disabled={creating}
                  className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                  {creating ? "Generating link…" : "Generate shareable link"}
                </button>
                <p className="mt-3 text-xs text-center text-gray-400">
                  Pro plan required.{" "}
                  <Link
                    href="/settings"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    upgrade in Settings
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
