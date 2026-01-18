const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export class GitHubAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

async function makeGitHubRequest(
  path: string,
  token: string,
  options: { method?: 'GET' | 'POST' | 'PUT'; body?: string } = {}
): Promise<Response> {
  const { method = 'GET', body } = options;
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new GitHubAPIError(
      response.status,
      `GitHub API error: ${response.status} - ${error}`
    );
  }

  return response;
}

export async function testConnection(
  token: string,
  repoName: string,
  owner: string
): Promise<TestConnectionResult> {
  try {
    const response = await makeGitHubRequest(`/repos/${owner}/${repoName}`, token);
    await response.json();
    return {
      success: true,
      message: 'Successfully connected to repository',
    };
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      if (error.status === 401) {
        return {
          success: false,
          message: 'Invalid GitHub token',
        };
      }
      if (error.status === 404) {
        return {
          success: false,
          message: 'Repository not found',
        };
      }
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
    return {
      success: false,
      message: 'Network error: Unable to connect',
    };
  }
}

export async function listMarkdownFiles(
  token: string,
  repoName: string,
  owner: string,
  branch: string = 'main'
): Promise<GitHubFile[]> {
  const response = await makeGitHubRequest(
    `/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`,
    token
  );

  const data = await response.json();

  const markdownFiles = data.tree
    .filter((item: any) => item.type === 'blob' && item.path.endsWith('.md'))
    .map((item: any) => ({
      name: item.path.split('/').pop() || item.path,
      path: item.path,
      sha: item.sha,
      size: item.size,
    }));

  return markdownFiles;
}

export interface FileContentResult {
  content: string;
  sha: string;
}

export async function fetchFileContent(
  token: string,
  repoName: string,
  owner: string,
  filePath: string
): Promise<string> {
  const result = await fetchFileContentWithSha(token, repoName, owner, filePath);
  return result.content;
}

export async function fetchFileContentWithSha(
  token: string,
  repoName: string,
  owner: string,
  filePath: string
): Promise<FileContentResult> {
  const response = await makeGitHubRequest(
    `/repos/${owner}/${repoName}/contents/${filePath}`,
    token
  );

  const data = await response.json();

  if (data.content) {
    const decoded = atob(data.content.replace(/\n/g, ''));
    return {
      content: decoded,
      sha: data.sha,
    };
  }

  throw new Error('File content not found');
}

export async function updateFileContent(
  token: string,
  repoName: string,
  owner: string,
  filePath: string,
  content: string,
  sha: string,
  message: string = `Update ${filePath}`
): Promise<void> {
  const encodedContent = btoa(content);

  await makeGitHubRequest(
    `/repos/${owner}/${repoName}/contents/${filePath}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodedContent,
        sha,
      }),
    }
  );
}
