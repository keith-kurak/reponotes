import Storage from "expo-sqlite/kv-store";

const NOTES_METADATA_KEY = "notes_metadata";

export interface NoteMetadata {
  sha?: string;
  hasPendingChanges?: boolean;
  isPinned?: boolean;
  // Future properties can be added here:
  // isPrivate?: boolean;
  // summary?: string;
}

type AllNotesMetadata = Record<string, NoteMetadata>;

function getAllMetadata(): AllNotesMetadata {
  const data = Storage.getItemSync(NOTES_METADATA_KEY);
  return data ? JSON.parse(data) : {};
}

function saveAllMetadata(metadata: AllNotesMetadata): void {
  Storage.setItemSync(NOTES_METADATA_KEY, JSON.stringify(metadata));
}

export const noteMetadata = {
  get(filename: string): NoteMetadata {
    const all = getAllMetadata();
    return all[filename] ?? {};
  },

  getAll(): AllNotesMetadata {
    return getAllMetadata();
  },

  set(filename: string, metadata: NoteMetadata): void {
    const all = getAllMetadata();
    all[filename] = { ...all[filename], ...metadata };
    saveAllMetadata(all);
  },

  update(filename: string, updates: Partial<NoteMetadata>): void {
    const all = getAllMetadata();
    all[filename] = { ...all[filename], ...updates };
    saveAllMetadata(all);
  },

  remove(filename: string): void {
    const all = getAllMetadata();
    delete all[filename];
    saveAllMetadata(all);
  },

  // Convenience methods for common operations

  getSha(filename: string): string | undefined {
    return this.get(filename).sha;
  },

  setSha(filename: string, sha: string): void {
    this.update(filename, { sha });
  },

  hasPendingChanges(filename: string): boolean {
    return this.get(filename).hasPendingChanges ?? false;
  },

  setPendingChanges(filename: string, hasPending: boolean): void {
    this.update(filename, { hasPendingChanges: hasPending });
  },

  getAllPendingFiles(): string[] {
    const all = getAllMetadata();
    return Object.entries(all)
      .filter(([_, meta]) => meta.hasPendingChanges)
      .map(([filename]) => filename);
  },

  isPinned(filename: string): boolean {
    return this.get(filename).isPinned ?? false;
  },

  setPinned(filename: string, isPinned: boolean): void {
    this.update(filename, { isPinned });
  },

  getAllPinnedFiles(): string[] {
    const all = getAllMetadata();
    return Object.entries(all)
      .filter(([_, meta]) => meta.isPinned)
      .map(([filename]) => filename);
  },
};
