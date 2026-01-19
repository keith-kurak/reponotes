import Storage from 'expo-sqlite/kv-store';

const PENDING_CHANGES_KEY = 'pending_changes';
const FILE_SHA_PREFIX = 'file_sha_';

export const pendingChanges = {
  getAll(): string[] {
    const data = Storage.getItemSync(PENDING_CHANGES_KEY);
    return data ? JSON.parse(data) : [];
  },

  has(filename: string): boolean {
    const pending = this.getAll();
    return pending.includes(filename);
  },

  add(filename: string): void {
    const pending = this.getAll();
    if (!pending.includes(filename)) {
      pending.push(filename);
      Storage.setItemSync(PENDING_CHANGES_KEY, JSON.stringify(pending));
    }
  },

  remove(filename: string): void {
    const pending = this.getAll();
    const filtered = pending.filter(f => f !== filename);
    Storage.setItemSync(PENDING_CHANGES_KEY, JSON.stringify(filtered));
  },

  clear(): void {
    Storage.setItemSync(PENDING_CHANGES_KEY, JSON.stringify([]));
  },
};

export const fileSha = {
  get(filename: string): string | null {
    return Storage.getItemSync(`${FILE_SHA_PREFIX}${filename}`);
  },

  set(filename: string, sha: string): void {
    Storage.setItemSync(`${FILE_SHA_PREFIX}${filename}`, sha);
  },

  remove(filename: string): void {
    Storage.removeItemSync(`${FILE_SHA_PREFIX}${filename}`);
  },
};
