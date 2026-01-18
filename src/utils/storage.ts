import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  GITHUB_PAT: '@reponotes/github_pat',
  REPO_NAME: '@reponotes/repo_name',
  GITHUB_OWNER: '@reponotes/github_owner',
} as const;

export const storage = {
  async getGitHubPAT(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.GITHUB_PAT);
  },

  async setGitHubPAT(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GITHUB_PAT, token);
  },

  async getRepoName(): Promise<string> {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.REPO_NAME);
    return stored || 'reponotes-notebook';
  },

  async setRepoName(repoName: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.REPO_NAME, repoName);
  },

  async getGitHubOwner(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.GITHUB_OWNER);
  },

  async setGitHubOwner(owner: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GITHUB_OWNER, owner);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GITHUB_PAT,
      STORAGE_KEYS.REPO_NAME,
      STORAGE_KEYS.GITHUB_OWNER,
    ]);
  },
};
