import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { DashboardContent } from "./DashboardContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth error:", error);
    redirect("/auth/signin");
  }

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const orgId = session.orgId;

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <svg
            className="w-7 h-7 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No organization found</h2>
        <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
          Sign out and sign in again to set up your organization.
        </p>
      </div>
    );
  }

  // Fetch data with error handling
  let githubConnection = null;
  type RepositoryWithCount = Prisma.RepositoryGetPayload<{
    include: { _count: { select: { commits: true; pullRequests: true } } };
  }>;
  let repositories: RepositoryWithCount[] = [];
  let subscription = null;
  let recentExports: Awaited<ReturnType<typeof db.export.findMany>> = [];

  try {
    [githubConnection, repositories, subscription, recentExports] = await Promise.all([
      db.gitHubConnection.findUnique({ where: { orgId } }).catch(() => null),
      db.repository
        .findMany({
          where: { orgId, isActive: true },
          include: {
            _count: {
              select: {
                commits: true,
                pullRequests: true,
              },
            },
          },
        })
        .catch(() => []),
      db.subscription.findUnique({ where: { orgId } }).catch(() => null),
      db.export
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
        .catch(() => []),
    ]);
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
  }

  const totalCommits = repositories.reduce((sum, r) => sum + r._count.commits, 0);
  const totalPRs = repositories.reduce((sum, r) => sum + r._count.pullRequests, 0);

  return (
    <DashboardContent
      repositories={repositories}
      githubConnection={githubConnection}
      subscription={subscription}
      recentExports={recentExports}
      totalCommits={totalCommits}
      totalPRs={totalPRs}
    />
  );
}
