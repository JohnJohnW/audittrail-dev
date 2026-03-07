import { db } from "./db";
import { GITHUB_CONFIG } from "./constants";
import { logger } from "./logger";
import { decrypt } from "./encryption";

// Re-export GitHub API types from the central types directory.
// Import directly from @/types/github for tree-shaking benefits.
export type {
  GitHubRepo,
  GitHubCommit,
  GitHubPullRequest,
  GitHubReview,
  GitHubBranchProtection,
} from "@/types/github";

import type {
  GitHubRepo,
  GitHubCommit,
  GitHubPullRequest,
  GitHubReview,
  GitHubBranchProtection,
} from "@/types/github";

const GITHUB_API_BASE = GITHUB_CONFIG.API_BASE;

export class GitHubClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "GitHub token is invalid or expired. Please reconnect your GitHub account."
        );
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
        if (rateLimitRemaining === "0") {
          const resetTime = response.headers.get("X-RateLimit-Reset");
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          throw new Error(
            `GitHub API rate limit exceeded. Resets at ${resetDate?.toLocaleString() || "unknown"}`
          );
        }
        throw new Error("GitHub API access forbidden. Check token scopes.");
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validates the token by making a lightweight API call
   * Returns user info if valid, throws if invalid
   */
  async validateToken(): Promise<{ valid: boolean; login?: string; error?: string }> {
    try {
      const user = await this.getUser();
      return { valid: true, login: user.login };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getUser(): Promise<{ id: number; login: string; type: string }> {
    return this.fetch("/user");
  }

  async getRepositories(page = 1, perPage = 100): Promise<GitHubRepo[]> {
    return this.fetch(`/user/repos?page=${page}&per_page=${perPage}&sort=pushed&direction=desc`);
  }

  async getAllRepositories(): Promise<GitHubRepo[]> {
    const allRepos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos = await this.getRepositories(page, 100);
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
    }

    return allRepos;
  }

  async getCommits(
    owner: string,
    repo: string,
    since?: Date,
    page = 1,
    perPage = 100
  ): Promise<GitHubCommit[]> {
    let endpoint = `/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`;
    if (since) {
      endpoint += `&since=${since.toISOString()}`;
    }
    return this.fetch(endpoint);
  }

  async getPullRequests(
    owner: string,
    repo: string,
    state: "all" | "open" | "closed" = "all",
    page = 1,
    perPage = 100
  ): Promise<GitHubPullRequest[]> {
    return this.fetch(
      `/repos/${owner}/${repo}/pulls?state=${state}&page=${page}&per_page=${perPage}&sort=updated&direction=desc`
    );
  }

  async getReviews(owner: string, repo: string, prNumber: number): Promise<GitHubReview[]> {
    return this.fetch(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  }

  async getBranchProtection(
    owner: string,
    repo: string,
    branch: string
  ): Promise<GitHubBranchProtection | null> {
    try {
      return await this.fetch(`/repos/${owner}/${repo}/branches/${branch}/protection`);
    } catch (_error) {
      // Branch protection not enabled
      return null;
    }
  }
}

export async function getGitHubClientForOrg(orgId: string): Promise<GitHubClient | null> {
  const connection = await db.gitHubConnection.findUnique({
    where: { orgId },
  });

  if (!connection) {
    return null;
  }

  // Check if token is known to be expired
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    logger.warn(`GitHub token for org ${orgId} has expired`, {
      expiredAt: connection.tokenExpiresAt.toISOString(),
    });
    // Token is expired - could implement refresh logic here
    // For now, still return the client and let it fail with a clear error
  }

  return new GitHubClient(decrypt(connection.accessToken));
}

/**
 * Validates the GitHub connection for an organization
 * Returns validation result with details
 */
export async function validateGitHubConnection(orgId: string): Promise<{
  connected: boolean;
  valid: boolean;
  login?: string;
  error?: string;
  expiresAt?: Date;
}> {
  const connection = await db.gitHubConnection.findUnique({
    where: { orgId },
  });

  if (!connection) {
    return { connected: false, valid: false, error: "No GitHub connection found" };
  }

  const client = new GitHubClient(decrypt(connection.accessToken));
  const validation = await client.validateToken();

  return {
    connected: true,
    valid: validation.valid,
    login: validation.login,
    error: validation.error,
    expiresAt: connection.tokenExpiresAt || undefined,
  };
}
