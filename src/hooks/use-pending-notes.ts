import { listLocalFiles } from "@/utils/fileSystem";
import { noteMetadata } from "@/utils/noteMetadata";
import { pendingChanges } from "@/utils/pendingChanges";

import { useNotesData } from "./use-notes-version";

export type PendingState = "conflict" | "new" | "edited";

export interface PendingNote {
  path: string;
  state: PendingState;
}

/** Notes with changes that are not on GitHub yet; updates live. */
export function usePendingNotes() {
  return useNotesData(() => {
    const files = new Set(listLocalFiles());
    const notes: PendingNote[] = pendingChanges
      .getAll()
      .filter((path) => files.has(path))
      .map((path) => ({
        path,
        state: noteMetadata.hasConflict(path)
          ? "conflict"
          : noteMetadata.getSha(path)
            ? "edited"
            : "new",
      }));
    // Conflicts first, then by path.
    notes.sort(
      (a, b) =>
        Number(b.state === "conflict") - Number(a.state === "conflict") ||
        a.path.localeCompare(b.path),
    );
    const conflicts = notes.filter((n) => n.state === "conflict").length;
    return { notes, conflicts };
  });
}
