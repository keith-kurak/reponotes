import type { SyncStatus } from "./syncState";

export interface StatusLine {
  text: string;
  tone: "neutral" | "warning" | "error";
}

export function formatRelativeTime(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** One status line from the shared sync state and the local change counts. */
export function describeSyncStatus(
  status: SyncStatus,
  counts: { pending: number; conflicts: number },
  now: number,
): StatusLine {
  if (status.isSyncing) return { text: "Syncing…", tone: "neutral" };
  if (status.lastError) {
    return { text: `Sync failed: ${status.lastError}`, tone: "error" };
  }
  const unsynced = counts.pending - counts.conflicts;
  const parts: string[] = [];
  if (counts.conflicts > 0) {
    parts.push(`${plural(counts.conflicts, "conflict")} to resolve`);
  }
  if (unsynced > 0) parts.push(`${plural(unsynced, "change")} not synced`);
  if (parts.length > 0) return { text: parts.join(" · "), tone: "warning" };
  if (status.lastSyncedAt) {
    return {
      text: `Up to date · synced ${formatRelativeTime(status.lastSyncedAt, now)}`,
      tone: "neutral",
    };
  }
  return { text: "Not synced yet", tone: "neutral" };
}
