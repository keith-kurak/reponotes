import { Directory, File, Paths } from "expo-file-system";

import { notifyNotesChanged } from "./notesStore";

// Notes are stored under <documents>/notes using the same relative path as in
// the GitHub repository, for example "projects/plan.md".
const notesDirectory = new Directory(Paths.document, "notes");

function ensureNotesDirectory(): void {
  if (!notesDirectory.exists) {
    notesDirectory.create();
  }
}

function isNoteFile(name: string): boolean {
  return name.endsWith(".md") || name.endsWith(".txt");
}

/**
 * Normalizes a user-entered or repo path: trims spaces and slashes, removes
 * empty, "." and ".." segments. Returns "" when nothing valid is left.
 */
export function normalizeNotePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function noteFile(path: string): File {
  const normalized = normalizeNotePath(path);
  if (!normalized) {
    throw new Error("Invalid file path");
  }
  return new File(notesDirectory, ...normalized.split("/"));
}

export function getFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function getFolderPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

/** Returns all note paths relative to the notes directory, sorted. */
export function listLocalFiles(): string[] {
  ensureNotesDirectory();
  const results: string[] = [];

  const walk = (directory: Directory, prefix: string) => {
    for (const item of directory.list()) {
      if (item instanceof Directory) {
        walk(item, `${prefix}${item.name}/`);
      } else if (item instanceof File && isNoteFile(item.name)) {
        results.push(`${prefix}${item.name}`);
      }
    }
  };

  walk(notesDirectory, "");
  return results.sort((a, b) => a.localeCompare(b));
}

export interface FolderContents {
  /** Full paths of direct subfolders, e.g. "projects/2026". */
  folders: string[];
  /** Full paths of notes directly in the folder. */
  files: string[];
}

function folderDirectory(folderPath: string): Directory {
  const normalized = normalizeNotePath(folderPath);
  return normalized
    ? new Directory(notesDirectory, ...normalized.split("/"))
    : notesDirectory;
}

/** Lists the direct children of a folder ("" is the root). */
export function listFolder(folderPath: string): FolderContents {
  ensureNotesDirectory();
  const directory = folderDirectory(folderPath);
  const prefix = normalizeNotePath(folderPath);
  const result: FolderContents = { folders: [], files: [] };
  if (!directory.exists) return result;
  for (const item of directory.list()) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item instanceof Directory) {
      result.folders.push(path);
    } else if (item instanceof File && isNoteFile(item.name)) {
      result.files.push(path);
    }
  }
  const byName = (a: string, b: string) =>
    getFileName(a).localeCompare(getFileName(b));
  result.folders.sort(byName);
  result.files.sort(byName);
  return result;
}

export function localFolderExists(folderPath: string): boolean {
  ensureNotesDirectory();
  return folderDirectory(folderPath).exists;
}

/**
 * Creates a local folder. GitHub cannot store an empty folder, so the folder
 * exists only on this device until it has a note.
 */
export function createLocalFolder(folderPath: string): void {
  ensureNotesDirectory();
  const directory = folderDirectory(folderPath);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  notifyNotesChanged();
}

export function localFileExists(path: string): boolean {
  ensureNotesDirectory();
  return noteFile(path).exists;
}

export function readLocalFile(path: string): string {
  ensureNotesDirectory();
  const file = noteFile(path);

  if (!file.exists) {
    throw new Error(`File not found: ${path}`);
  }

  return file.textSync();
}

export function writeLocalFile(path: string, content: string): void {
  ensureNotesDirectory();
  const file = noteFile(path);
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(content);
  notifyNotesChanged();
}

export function deleteLocalFile(path: string): void {
  ensureNotesDirectory();
  const file = noteFile(path);
  if (!file.exists) return;
  file.delete();

  // Remove parent folders that are now empty.
  const stripSlash = (uri: string) => uri.replace(/\/+$/, "");
  const rootUri = stripSlash(notesDirectory.uri);
  let directory = file.parentDirectory;
  while (
    stripSlash(directory.uri).length > rootUri.length &&
    directory.exists &&
    directory.list().length === 0
  ) {
    const parent = directory.parentDirectory;
    directory.delete();
    directory = parent;
  }
  notifyNotesChanged();
}

export function clearAllLocalFiles(): void {
  ensureNotesDirectory();
  for (const item of notesDirectory.list()) {
    item.delete();
  }
}

export function getNotesDirectory(): string {
  return notesDirectory.uri;
}
