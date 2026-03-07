"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/Button";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/github/sync", { method: "POST" });
      router.refresh();
    } catch (error) {
      logger.error("Sync failed", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing} loading={syncing}>
      {!syncing && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      )}
      {syncing ? "Syncing..." : "Sync Now"}
    </Button>
  );
}
