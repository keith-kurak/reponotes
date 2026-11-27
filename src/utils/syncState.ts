import Storage from "expo-sqlite/kv-store";

// One sync state for the whole app, so every screen shows the same status.

const LAST_SYNCED_KEY = "@reponotes/last_synced_at";

export interface SyncStatus {
  isSyncing: boolean;
  /** Time of the last sync that finished without an error. */
  lastSyncedAt: number | null;
  /** Message of the last sync that failed; cleared by a good sync. */
  lastError: string | null;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let status: SyncStatus = {
  isSyncing: false,
  lastSyncedAt: Number(Storage.getItemSync(LAST_SYNCED_KEY)) || null,
  lastError: null,
};

export function getSyncStatus(): SyncStatus {
  return status;
}

export function updateSyncStatus(changes: Partial<SyncStatus>): void {
  status = { ...status, ...changes };
  if (changes.lastSyncedAt) {
    Storage.setItemSync(LAST_SYNCED_KEY, String(changes.lastSyncedAt));
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
