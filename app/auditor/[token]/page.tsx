"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ---- Types ----

interface SessionInfo {
  id: string;
  auditorEmail: string;
  auditorName: string | null;
  frameworkFilter: string | null;
  expiresAt: string;
}

interface Signoff {
  controlCode: string;
  frameworkName: string;
  verdict: "approved" | "needs_more_info" | "rejected";
  note: string | null;
  signedAt: string;
}

interface ControlWithMeta {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  controlDescription: string | null;
  frameworkName: string;
  status: string;
  evidenceCount: number;
  evidence: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
    url?: string;
    repositoryFullName?: string;
    repositoryName?: string;
  }>;
  signoff: Signoff | null;
  commentCount: number;
}

interface Comment {
  id: string;
  controlCode: string;
  frameworkName: string;
  body: string;
  status: string;
  createdAt: string;
}

interface EvidenceData {
  session: SessionInfo;
  summary: {
    total: number;
    withEvidence: number;
    score: number;
  };
  controls: ControlWithMeta[];
}

// ---- Verdict helpers ----

const verdictConfig = {
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  needs_more_info: {
    label: "Needs Info",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
} as const;

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "default" }
> = {
  has_evidence: { label: "Has Evidence", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  limited: { label: "Limited", variant: "default" },
  no_evidence: { label: "Missing", variant: "error" },
};

// ---- Main page component ----

export default function AuditorPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlWithMeta | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<
    "all" | "approved" | "needs_more_info" | "rejected" | "unsigned"
  >("all");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [signoffNote, setSignoffNote] = useState("");

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch(`/api/auditor/${token}/evidence`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error ?? "Failed to load evidence");
        return;
      }
      const d: EvidenceData = await res.json();
      setData(d);
      if (!selectedControl && d.controls.length > 0) {
        setSelectedControl(d.controls[0]);
      }
    } catch {
      setError("Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [token, selectedControl]);

  useEffect(() => {
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fetch comments when control changes
  useEffect(() => {
    if (!selectedControl) return;
    fetch(`/api/auditor/${token}/comments`)
      .then((r) => r.json())
      .then((d: { comments: Comment[] }) => {
        setComments(
          (d.comments ?? []).filter(
            (c) =>
              c.controlCode === selectedControl.controlCode &&
              c.frameworkName === selectedControl.frameworkName
          )
        );
      })
      .catch(() => {
        /* non-critical */
      });
    setSignoffNote(selectedControl.signoff?.note ?? "");
  }, [selectedControl, token]);

  const handleSignoff = async (verdict: "approved" | "needs_more_info" | "rejected") => {
    if (!selectedControl) return;
    setSignoffSaving(true);
    try {
      const res = await fetch(`/api/auditor/${token}/signoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlCode: selectedControl.controlCode,
          frameworkName: selectedControl.frameworkName,
          verdict,
          note: signoffNote || null,
        }),
      });
      if (res.ok) {
        // Refresh evidence to get updated signoffs
        await fetchEvidence();
      }
    } finally {
      setSignoffSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedControl || !newComment.trim()) return;
    setCommentSaving(true);
    try {
      const res = await fetch(`/api/auditor/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlCode: selectedControl.controlCode,
          frameworkName: selectedControl.frameworkName,
          body: newComment.trim(),
        }),
      });
      if (res.ok) {
        const d: { comment: Comment } = await res.json();
        setComments((prev) => [...prev, d.comment]);
        setNewComment("");
      }
    } finally {
      setCommentSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading audit workspace…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500">{error ?? "This link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  const { session, summary, controls } = data;

  const filteredControls = controls.filter((c) => {
    if (verdictFilter === "all") return true;
    if (verdictFilter === "unsigned") return !c.signoff;
    return c.signoff?.verdict === verdictFilter;
  });

  const approvedCount = controls.filter((c) => c.signoff?.verdict === "approved").length;
  const flaggedCount = controls.filter(
    (c) => c.signoff?.verdict === "needs_more_info" || c.signoff?.verdict === "rejected"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
                Auditor View
              </span>
              {session.frameworkFilter && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  {session.frameworkFilter}
                </span>
              )}
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Compliance Evidence Review</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {session.auditorName ?? session.auditorEmail} · {approvedCount}/{controls.length}{" "}
              controls signed off · Overall score {summary.score}%
            </p>
          </div>
          <a
            href={`/api/auditor/${token}/export`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Evidence Package
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-73px)]">
        {/* Left panel — control list */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Verdict filter tabs */}
          <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
            {(["all", "unsigned", "approved", "needs_more_info", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVerdictFilter(f)}
                className={cn(
                  "shrink-0 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  verdictFilter === f
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f === "all"
                  ? `All (${controls.length})`
                  : f === "unsigned"
                    ? `Unsigned (${controls.filter((c) => !c.signoff).length})`
                    : f === "approved"
                      ? `Approved (${approvedCount})`
                      : f === "needs_more_info"
                        ? "Needs Info"
                        : `Rejected (${controls.filter((c) => c.signoff?.verdict === "rejected").length})`}
              </button>
            ))}
          </div>

          {/* Control list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredControls.map((c) => {
              const sc = statusConfig[c.status] ?? { label: c.status, variant: "default" as const };
              const isSelected = selectedControl?.controlId === c.controlId;
              return (
                <button
                  key={c.controlId}
                  onClick={() => setSelectedControl(c)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50 border-l-2 border-blue-600"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-500">{c.controlCode}</p>
                      <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                        {c.controlTitle}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {c.signoff ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                            verdictConfig[c.signoff.verdict].className
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              verdictConfig[c.signoff.verdict].dot
                            )}
                          />
                          {verdictConfig[c.signoff.verdict].label}
                        </span>
                      ) : (
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      )}
                    </div>
                  </div>
                  {c.commentCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {c.commentCount} comment{c.commentCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </button>
              );
            })}
            {filteredControls.length === 0 && (
              <p className="p-6 text-sm text-gray-400 text-center">No controls match this filter</p>
            )}
          </div>

          {/* Progress summary */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Sign-off progress</span>
              <span>
                {approvedCount + flaggedCount}/{controls.length}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${controls.length ? ((approvedCount + flaggedCount) / controls.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right panel — control detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedControl ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a control to review
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Control header */}
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="font-mono text-sm bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                    {selectedControl.controlCode}
                  </span>
                  <Badge variant={statusConfig[selectedControl.status]?.variant ?? "default"}>
                    {statusConfig[selectedControl.status]?.label ?? selectedControl.status}
                  </Badge>
                  <span className="text-sm text-gray-500">{selectedControl.frameworkName}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedControl.controlTitle}
                </h2>
                {selectedControl.controlDescription && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                    {selectedControl.controlDescription}
                  </p>
                )}
              </div>

              {/* Evidence items */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Evidence ({selectedControl.evidenceCount})
                  </h3>
                  {selectedControl.evidence.length === 0 ? (
                    <p className="text-sm text-gray-400">No evidence collected for this control.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedControl.evidence.slice(0, 10).map((item, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {item.repositoryFullName && (
                                <span className="text-xs text-gray-400 font-mono">
                                  {item.repositoryFullName}
                                </span>
                              )}
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedControl.evidence.length > 10 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          + {selectedControl.evidence.length - 10} more items in downloaded package
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Comments</h3>
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {comments.map((c) => (
                        <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-800">{c.body}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                            {c.status === "resolved" ? "Resolved" : "Open"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleAddComment();
                        }
                      }}
                      placeholder="Add a comment or request additional evidence…"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || commentSaving}
                      size="sm"
                    >
                      Post
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sign-off panel */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Auditor Sign-Off</h3>
                  {selectedControl.signoff && (
                    <div
                      className={cn(
                        "mb-4 p-3 rounded-lg text-sm",
                        verdictConfig[selectedControl.signoff.verdict].className
                      )}
                    >
                      Current verdict:{" "}
                      <strong>{verdictConfig[selectedControl.signoff.verdict].label}</strong>
                      {selectedControl.signoff.note && (
                        <p className="mt-1 text-xs opacity-80">{selectedControl.signoff.note}</p>
                      )}
                    </div>
                  )}

                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Note (optional)
                  </label>
                  <textarea
                    value={signoffNote}
                    onChange={(e) => setSignoffNote(e.target.value)}
                    placeholder="Add context for your verdict…"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleSignoff("approved")}
                      disabled={signoffSaving}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleSignoff("needs_more_info")}
                      disabled={signoffSaving}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                    >
                      ⚠ Needs More Info
                    </Button>
                    <Button
                      onClick={() => handleSignoff("rejected")}
                      disabled={signoffSaving}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
