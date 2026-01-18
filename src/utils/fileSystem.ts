import * as FileSystem from 'expo-file-system';

const NOTES_DIR = `${FileSystem.documentDirectory}notes/`;

async function ensureNotesDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(NOTES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(NOTES_DIR, { intermediates: true });
  }
}

export async function listLocalFiles(): Promise<string[]> {
  await ensureNotesDirectory();
  const files = await FileSystem.readDirectoryAsync(NOTES_DIR);
  return files.filter(file => file.endsWith('.md')).sort();
}

export async function readLocalFile(filename: string): Promise<string> {
  await ensureNotesDirectory();
  const filePath = `${NOTES_DIR}${filename}`;
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (!fileInfo.exists) {
    throw new Error(`File not found: ${filename}`);
  }

  return await FileSystem.readAsStringAsync(filePath);
}

export async function writeLocalFile(filename: string, content: string): Promise<void> {
  await ensureNotesDirectory();
  const filePath = `${NOTES_DIR}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, content);
}

export async function deleteLocalFile(filename: string): Promise<void> {
  await ensureNotesDirectory();
  const filePath = `${NOTES_DIR}${filename}`;
  await FileSystem.deleteAsync(filePath, { idempotent: true });
}

export async function clearAllLocalFiles(): Promise<void> {
  await ensureNotesDirectory();
  const files = await FileSystem.readDirectoryAsync(NOTES_DIR);
  await Promise.all(
    files.map(file => FileSystem.deleteAsync(`${NOTES_DIR}${file}`, { idempotent: true }))
  );
}

export function getNotesDirectory(): string {
  return NOTES_DIR;
}
