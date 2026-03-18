/**
 * Test fixtures for Vigil
 */

export const fixtures = {
  organization: {
    id: "test-org-id",
    name: "Test Organization",
    slug: "test-org",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },

  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    emailVerified: new Date("2024-01-01"),
    image: "https://github.com/test.png",
  },

  gitHubConnection: {
    id: "test-gh-connection-id",
    orgId: "test-org-id",
    accessToken: "encrypted-token",
    refreshToken: "encrypted-refresh-token",
    tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    githubUserId: 12345,
    githubAccountLogin: "testuser",
  },

  repository: {
    id: "test-repo-id",
    orgId: "test-org-id",
    githubRepoId: BigInt(123456),
    name: "test-repo",
    fullName: "testorg/test-repo",
    defaultBranch: "main",
    isPrivate: false,
    isActive: true,
    lastSyncedAt: new Date("2024-01-01"),
  },

  commit: {
    id: "test-commit-id",
    repoId: "test-repo-id",
    sha: "abc123def456",
    message: "feat: add authentication system",
    authorName: "Test Author",
    authorEmail: "author@example.com",
    authorLogin: "testauthor",
    committedAt: new Date("2024-01-01"),
    verified: true,
  },

  pullRequest: {
    id: "test-pr-id",
    repoId: "test-repo-id",
    githubPrId: 42,
    number: 1,
    title: "Add authentication feature",
    body: "This PR adds user authentication",
    state: "merged" as const,
    authorLogin: "testauthor",
    createdAt: new Date("2024-01-01"),
    mergedAt: new Date("2024-01-02"),
  },

  review: {
    id: "test-review-id",
    prId: "test-pr-id",
    githubReviewId: BigInt(999),
    state: "APPROVED" as const,
    reviewerLogin: "reviewer",
    body: "LGTM!",
    submittedAt: new Date("2024-01-01"),
  },

  subscription: {
    id: "test-subscription-id",
    orgId: "test-org-id",
    stripeCustomerId: "cus_test123",
    stripeSubscriptionId: "sub_test123",
    plan: "pro" as const,
    status: "active" as const,
    currentPeriodStart: new Date("2024-01-01"),
    currentPeriodEnd: new Date("2024-02-01"),
    cancelAtPeriodEnd: false,
  },

  framework: {
    id: "test-framework-id",
    name: "ISO 27001:2022",
    description: "Information security management systems",
    version: "2022",
  },

  control: {
    id: "test-control-id",
    frameworkId: "test-framework-id",
    code: "A.5.1",
    title: "Information security policy",
    description: "Management should define an information security policy.",
    evidenceType: "commit_history",
  },
};

/**
 * Create array of fixtures
 */
export function createMany<T>(
  fixture: T,
  count: number,
  overrides?: (index: number) => Partial<T>
): T[] {
  return Array.from({ length: count }, (_, i) => ({
    ...fixture,
    ...(overrides ? overrides(i) : {}),
  }));
}
