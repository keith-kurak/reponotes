import { File, Directory, Paths } from 'expo-file-system';

const notesDirectory = new Directory(Paths.document, 'notes');

function ensureNotesDirectory(): void {
  if (!notesDirectory.exists) {
    notesDirectory.create();
  }
}

export function listLocalFiles(): string[] {
  ensureNotesDirectory();
  const items = notesDirectory.list();
  return items
    .filter((item): item is File =>
      item instanceof File && (item.name.endsWith('.md') || item.name.endsWith('.txt'))
    )
    .map(file => file.name)
    .sort();
}

export function readLocalFile(filename: string): string {
  ensureNotesDirectory();
  const file = new File(notesDirectory, filename);

  if (!file.exists) {
    throw new Error(`File not found: ${filename}`);
  }

  return file.textSync();
}

export function writeLocalFile(filename: string, content: string): void {
  ensureNotesDirectory();
  const file = new File(notesDirectory, filename);
  if (!file.exists) {
    file.create();
  }
  file.write(content);
}

export function deleteLocalFile(filename: string): void {
  ensureNotesDirectory();
  const file = new File(notesDirectory, filename);
  if (file.exists) {
    file.delete();
  }
}

export function clearAllLocalFiles(): void {
  ensureNotesDirectory();
  const items = notesDirectory.list();
  for (const item of items) {
    item.delete();
  }
}

export function getNotesDirectory(): string {
  return notesDirectory.uri;
}
