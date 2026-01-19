import { noteMetadata } from "./noteMetadata";

// These exports maintain backwards compatibility with existing code
// while using the new unified metadata storage

export const pendingChanges = {
  getAll(): string[] {
    return noteMetadata.getAllPendingFiles();
  },

  has(filename: string): boolean {
    return noteMetadata.hasPendingChanges(filename);
  },

  add(filename: string): void {
    noteMetadata.setPendingChanges(filename, true);
  },

  remove(filename: string): void {
    noteMetadata.setPendingChanges(filename, false);
  },

  clear(): void {
    const all = noteMetadata.getAll();
    for (const filename of Object.keys(all)) {
      noteMetadata.setPendingChanges(filename, false);
    }
  },
};

export const fileSha = {
  get(filename: string): string | null {
    return noteMetadata.getSha(filename) ?? null;
  },

  set(filename: string, sha: string): void {
    noteMetadata.setSha(filename, sha);
  },

  remove(filename: string): void {
    noteMetadata.update(filename, { sha: undefined });
  },
};
