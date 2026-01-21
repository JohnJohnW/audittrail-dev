import { db } from "./db";

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  pushed_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    login: string;
  } | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
  };
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
  merged_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
  };
  state: string;
  body: string | null;
  submitted_at: string;
}

export interface GitHubBranchProtection {
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
  };
  enforce_admins?: {
    enabled: boolean;
  };
  required_status_checks?: {
    strict: boolean;
    contexts: string[];
  };
}

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
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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

  async getCommits(owner: string, repo: string, since?: Date, page = 1, perPage = 100): Promise<GitHubCommit[]> {
    let endpoint = `/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`;
    if (since) {
      endpoint += `&since=${since.toISOString()}`;
    }
    return this.fetch(endpoint);
  }

  async getPullRequests(owner: string, repo: string, state: "all" | "open" | "closed" = "all", page = 1, perPage = 100): Promise<GitHubPullRequest[]> {
    return this.fetch(`/repos/${owner}/${repo}/pulls?state=${state}&page=${page}&per_page=${perPage}&sort=updated&direction=desc`);
  }

  async getReviews(owner: string, repo: string, prNumber: number): Promise<GitHubReview[]> {
    return this.fetch(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  }

  async getBranchProtection(owner: string, repo: string, branch: string): Promise<GitHubBranchProtection | null> {
    try {
      return await this.fetch(`/repos/${owner}/${repo}/branches/${branch}/protection`);
    } catch (error) {
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

  return new GitHubClient(connection.accessToken);
}
