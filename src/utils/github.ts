import { decodeBase64Utf8, encodeBase64Utf8 } from "./base64";

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubConfig {
  token: string;
  owner: string;
  repoName: string;
}

export interface GitHubFile {
  path: string;
  sha: string;
  size: number;
}

export interface FileContentResult {
  content: string;
  sha: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export class GitHubAPIError extends Error {
  constructor(
    public status: number,
    message: string,
    public githubMessage: string,
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

/** Thrown when GitHub cannot be reached (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor() {
    super(
      "Cannot reach GitHub. Check your connection. Your changes are saved on this device.",
    );
    this.name = "NetworkError";
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError;
}

function friendlyMessage(status: number, githubMessage: string): string {
  switch (status) {
    case 401:
      return "GitHub token is invalid or expired. Update it in Settings.";
    case 403:
      if (/rate limit/i.test(githubMessage)) {
        return "GitHub rate limit reached. Try again later.";
      }
      return "The GitHub token does not have permission for this repository. It needs Contents: Read and write.";
    case 404:
      return "Not found on GitHub. Check the owner and repository name in Settings.";
    case 409:
      if (/empty/i.test(githubMessage)) {
        return "The repository is empty.";
      }
      return "This file changed on GitHub since your last sync.";
    case 422:
      return `GitHub rejected the request: ${githubMessage}`;
    default:
      return status >= 500
        ? "GitHub is not available right now. Try again later."
        : `GitHub error ${status}: ${githubMessage}`;
  }
}

/** Encodes each path segment so names with spaces, "#" or "?" work. */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function repoPath(config: GitHubConfig): string {
  return `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repoName)}`;
}

async function makeGitHubRequest(
  path: string,
  token: string,
  options: { method?: "GET" | "PUT" | "DELETE"; body?: object } = {},
): Promise<Response> {
  const { method = "GET", body } = options;
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(body && { "Content-Type": "application/json" }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    const text = await response.text();
    let githubMessage = text;
    try {
      githubMessage = JSON.parse(text).message ?? text;
    } catch {
      // Body is not JSON; use the raw text.
    }
    throw new GitHubAPIError(
      response.status,
      friendlyMessage(response.status, githubMessage),
      githubMessage,
    );
  }

  return response;
}

export function isConflictError(error: unknown): boolean {
  return (
    error instanceof GitHubAPIError &&
    (error.status === 409 ||
      (error.status === 422 && /sha/i.test(error.githubMessage)))
  );
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof GitHubAPIError && error.status === 404;
}

export async function testConnection(
  config: GitHubConfig,
): Promise<TestConnectionResult> {
  try {
    const response = await makeGitHubRequest(repoPath(config), config.token);
    const repo = await response.json();
    if (repo.permissions && !repo.permissions.push) {
      return {
        success: false,
        message:
          "Connected, but the token cannot write to this repository. It needs Contents: Read and write.",
      };
    }
    if (repo.size === 0) {
      return {
        success: true,
        message:
          "Connected. The repository is empty. Create a note to make the first commit.",
      };
    }
    return { success: true, message: "Connected to the repository." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to connect.",
    };
  }
}

async function getDefaultBranch(config: GitHubConfig): Promise<string> {
  const response = await makeGitHubRequest(repoPath(config), config.token);
  const repo = await response.json();
  return repo.default_branch ?? "main";
}

/** Lists all markdown files in the repository. An empty repository returns []. */
export async function listMarkdownFiles(
  config: GitHubConfig,
): Promise<GitHubFile[]> {
  const branch = await getDefaultBranch(config);
  let data: any;
  try {
    const response = await makeGitHubRequest(
      `${repoPath(config)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      config.token,
    );
    data = await response.json();
  } catch (error) {
    // 409 = empty repository, 404 = the branch has no commits yet.
    if (
      error instanceof GitHubAPIError &&
      (error.status === 409 || error.status === 404)
    ) {
      return [];
    }
    throw error;
  }

  return data.tree
    .filter((item: any) => item.type === "blob" && item.path.endsWith(".md"))
    .map((item: any) => ({
      path: item.path,
      sha: item.sha,
      size: item.size,
    }));
}

export async function fetchFileContentWithSha(
  config: GitHubConfig,
  filePath: string,
): Promise<FileContentResult> {
  const response = await makeGitHubRequest(
    `${repoPath(config)}/contents/${encodePath(filePath)}`,
    config.token,
  );
  const data = await response.json();

  if (typeof data.content === "string") {
    return { content: decodeBase64Utf8(data.content), sha: data.sha };
  }
  throw new Error("File content not found.");
}

/**
 * Creates or updates a file. Pass the current SHA to update an existing file,
 * or no SHA to create a new one. Returns the new SHA.
 */
export async function putFileContent(
  config: GitHubConfig,
  filePath: string,
  content: string,
  sha?: string,
): Promise<string> {
  const response = await makeGitHubRequest(
    `${repoPath(config)}/contents/${encodePath(filePath)}`,
    config.token,
    {
      method: "PUT",
      body: {
        message: `${sha ? "Update" : "Create"} ${filePath}`,
        content: encodeBase64Utf8(content),
        ...(sha && { sha }),
      },
    },
  );
  const data = await response.json();
  return data.content.sha;
}
