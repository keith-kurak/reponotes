import Storage from 'expo-sqlite/kv-store';

const STORAGE_KEYS = {
  GITHUB_PAT: '@reponotes/github_pat',
  REPO_NAME: '@reponotes/repo_name',
  GITHUB_OWNER: '@reponotes/github_owner',
} as const;

export const storage = {
  getGitHubPAT(): string | null {
    return Storage.getItemSync(STORAGE_KEYS.GITHUB_PAT);
  },

  setGitHubPAT(token: string): void {
    Storage.setItemSync(STORAGE_KEYS.GITHUB_PAT, token);
  },

  getRepoName(): string {
    const stored = Storage.getItemSync(STORAGE_KEYS.REPO_NAME);
    return stored || 'reponotes-notebook';
  },

  setRepoName(repoName: string): void {
    Storage.setItemSync(STORAGE_KEYS.REPO_NAME, repoName);
  },

  getGitHubOwner(): string | null {
    return Storage.getItemSync(STORAGE_KEYS.GITHUB_OWNER);
  },

  setGitHubOwner(owner: string): void {
    Storage.setItemSync(STORAGE_KEYS.GITHUB_OWNER, owner);
  },

  clearAll(): void {
    Storage.removeItemSync(STORAGE_KEYS.GITHUB_PAT);
    Storage.removeItemSync(STORAGE_KEYS.REPO_NAME);
    Storage.removeItemSync(STORAGE_KEYS.GITHUB_OWNER);
  },
};
