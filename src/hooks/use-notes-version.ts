import { useSyncExternalStore } from "react";

import { getNotesVersion, subscribeNotes } from "@/utils/notesStore";

/** Changes every time a note file or note metadata changes. */
export function useNotesVersion(): number {
  return useSyncExternalStore(subscribeNotes, getNotesVersion);
}

// The version is a real argument here, so the React Compiler keeps it as a
// dependency and calls `read` again after every change. (A `void version`
// line inside a useMemo is removed by the compiler as dead code.)
function readAtVersion<T>(read: () => T, version: number): T {
  void version;
  return read();
}

/** Reads note data from disk or metadata, and reads it again on every change. */
export function useNotesData<T>(read: () => T): T {
  const version = useNotesVersion();
  return readAtVersion(read, version);
}
