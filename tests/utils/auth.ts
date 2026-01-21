import { vi } from "vitest";

/**
 * Mock session data for testing
 */
export interface MockSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  orgId?: string;
  orgSlug?: string;
  orgRole?: string;
  hasGitHubConnection?: boolean;
  expires: string;
}

export const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => ({
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    ...overrides.user,
  },
  orgId: "test-org-id",
  orgSlug: "test-org",
  orgRole: "owner",
  hasGitHubConnection: true,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const createMockUnauthenticatedSession = (): null => null;

/**
 * Set up auth mock for tests
 */
export async function setupAuthMock(session: MockSession | null = createMockSession()) {
  const authModule = await import("@/lib/auth");
  const mockedAuth = vi.mocked(authModule.auth);
  mockedAuth.mockResolvedValue(session as unknown as Awaited<ReturnType<typeof authModule.auth>>);
  return mockedAuth;
}
