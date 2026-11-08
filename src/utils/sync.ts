import {
  deleteLocalFile,
  listLocalFiles,
  localFileExists,
  readLocalFile,
  writeLocalFile,
} from "./fileSystem";
import {
  fetchFileContentWithSha,
  isConflictError,
  isNetworkError,
  isNotFoundError,
  listMarkdownFiles,
  putFileContent,
} from "./github";
import { noteMetadata } from "./noteMetadata";
import { fileSha, pendingChanges } from "./pendingChanges";
import { storage } from "./storage";

export interface SyncResult {
  downloaded: number;
  deleted: string[];
  /** Files with local changes that sync did not overwrite. */
  skippedPending: string[];
}

/**
 * Downloads all markdown files from GitHub.
 * - Files with pending local changes are never overwritten.
 * - Files that are unchanged on GitHub are not downloaded again.
 * - Local files that were synced before but are now deleted on GitHub are
 *   removed, unless they have pending changes.
 */
export async function syncAllFromGitHub(): Promise<SyncResult> {
  const config = storage.getGitHubConfig();
  const remoteFiles = await listMarkdownFiles(config);
  const remotePaths = new Set(remoteFiles.map((file) => file.path));

  const result: SyncResult = { downloaded: 0, deleted: [], skippedPending: [] };

  await Promise.all(
    remoteFiles.map(async (file) => {
      if (pendingChanges.has(file.path)) {
        result.skippedPending.push(file.path);
        return;
      }
      if (fileSha.get(file.path) === file.sha && localFileExists(file.path)) {
        return;
      }
      const remote = await fetchFileContentWithSha(config, file.path);
      writeLocalFile(file.path, remote.content);
      fileSha.set(file.path, remote.sha);
      result.downloaded += 1;
    }),
  );

  for (const path of listLocalFiles()) {
    const wasSynced = !!fileSha.get(path);
    if (wasSynced && !remotePaths.has(path) && !pendingChanges.has(path)) {
      deleteLocalFile(path);
      noteMetadata.remove(path);
      result.deleted.push(path);
    }
  }

  result.skippedPending.sort();
  result.deleted.sort();
  return result;
}

export type UploadResult = "uploaded" | "conflict";

/**
 * Uploads the local copy of a note. Returns "conflict" when the file on
 * GitHub changed since the last sync (or exists but was never synced).
 */
export async function uploadNote(path: string): Promise<UploadResult> {
  const config = storage.getGitHubConfig();
  const content = readLocalFile(path);
  const sha = fileSha.get(path) ?? undefined;

  let newSha: string;
  try {
    newSha = await putFileContent(config, path, content, sha);
  } catch (error) {
    if (isConflictError(error)) {
      return "conflict";
    }
    throw error;
  }

  fileSha.set(path, newSha);
  pendingChanges.remove(path);
  return "uploaded";
}

/** Replaces the local copy with the version on GitHub. */
export async function downloadNote(path: string): Promise<string> {
  const config = storage.getGitHubConfig();
  const remote = await fetchFileContentWithSha(config, path);
  writeLocalFile(path, remote.content);
  fileSha.set(path, remote.sha);
  pendingChanges.remove(path);
  return remote.content;
}

/** Conflict resolution: overwrite the GitHub version with the local copy. */
export async function forceUploadNote(path: string): Promise<void> {
  const config = storage.getGitHubConfig();
  let remoteSha: string | undefined;
  try {
    remoteSha = (await fetchFileContentWithSha(config, path)).sha;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
  const newSha = await putFileContent(
    config,
    path,
    readLocalFile(path),
    remoteSha,
  );
  fileSha.set(path, newSha);
  pendingChanges.remove(path);
}

export interface UploadAllResult {
  uploaded: string[];
  conflicts: string[];
  failed: { path: string; message: string }[];
  /** True when the upload stopped because GitHub could not be reached. */
  offline: boolean;
}

/** Uploads every note with pending changes, one at a time. */
export async function uploadAllPending(): Promise<UploadAllResult> {
  const result: UploadAllResult = {
    uploaded: [],
    conflicts: [],
    failed: [],
    offline: false,
  };

  for (const path of pendingChanges.getAll()) {
    if (!localFileExists(path)) {
      pendingChanges.remove(path);
      continue;
    }
    try {
      const status = await uploadNote(path);
      (status === "uploaded" ? result.uploaded : result.conflicts).push(path);
    } catch (error) {
      if (isNetworkError(error)) {
        // No point in trying the other files; they stay pending.
        result.offline = true;
        break;
      }
      result.failed.push({
        path,
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
  return result;
}
