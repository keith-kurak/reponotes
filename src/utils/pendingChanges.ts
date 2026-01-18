import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CHANGES_KEY = 'pending_changes';
const FILE_SHA_PREFIX = 'file_sha_';

export const pendingChanges = {
  async getAll(): Promise<string[]> {
    const data = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
    return data ? JSON.parse(data) : [];
  },

  async has(filename: string): Promise<boolean> {
    const pending = await this.getAll();
    return pending.includes(filename);
  },

  async add(filename: string): Promise<void> {
    const pending = await this.getAll();
    if (!pending.includes(filename)) {
      pending.push(filename);
      await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending));
    }
  },

  async remove(filename: string): Promise<void> {
    const pending = await this.getAll();
    const filtered = pending.filter(f => f !== filename);
    await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filtered));
  },

  async clear(): Promise<void> {
    await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify([]));
  },
};

export const fileSha = {
  async get(filename: string): Promise<string | null> {
    return AsyncStorage.getItem(`${FILE_SHA_PREFIX}${filename}`);
  },

  async set(filename: string, sha: string): Promise<void> {
    await AsyncStorage.setItem(`${FILE_SHA_PREFIX}${filename}`, sha);
  },

  async remove(filename: string): Promise<void> {
    await AsyncStorage.removeItem(`${FILE_SHA_PREFIX}${filename}`);
  },
};
