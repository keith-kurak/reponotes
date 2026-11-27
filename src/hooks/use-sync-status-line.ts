import { useEffect, useState } from "react";

import { describeSyncStatus } from "@/utils/syncStatusText";

import { usePendingNotes } from "./use-pending-notes";
import { useSyncStatus } from "./use-sync-status";

/** The one-line sync status; it updates live and keeps "5 min ago" current. */
export function useSyncStatusLine() {
  const status = useSyncStatus();
  const { notes, conflicts } = usePendingNotes();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // A sync that just finished is newer than the last tick.
  const now = Math.max(tick, status.lastSyncedAt ?? 0);
  return {
    ...describeSyncStatus(status, { pending: notes.length, conflicts }, now),
    isSyncing: status.isSyncing,
  };
}
