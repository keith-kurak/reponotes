import { useSyncExternalStore } from "react";

import { getSyncStatus, subscribeSyncStatus } from "@/utils/syncState";

export function useSyncStatus() {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
}
