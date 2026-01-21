"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/github/sync", { method: "POST" });
      router.refresh();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-accent bg-accent-light rounded-lg hover:bg-accent-light/80 transition-colors disabled:opacity-50"
    >
      <svg
        className={`w-4 h-4 mr-1.5 ${syncing ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
