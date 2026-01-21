import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SyncButton } from "@/components/dashboard/SyncButton";

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
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          No organization found
        </h2>
        <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
          Sign out and sign in again to set up your organization.
        </p>
      </div>
    );
  }

  // Fetch data with error handling
  let githubConnection = null;
  let repositories: Awaited<ReturnType<typeof db.repository.findMany>> = [];
  let subscription = null;
  let recentExports: Awaited<ReturnType<typeof db.export.findMany>> = [];

  try {
    [githubConnection, repositories, subscription, recentExports] = await Promise.all([
      db.gitHubConnection.findUnique({ where: { orgId } }).catch(() => null),
      db.repository.findMany({
        where: { orgId, isActive: true },
        include: {
          _count: {
            select: {
              commits: true,
              pullRequests: true,
            },
          },
        },
      }).catch(() => []),
      db.subscription.findUnique({ where: { orgId } }).catch(() => null),
      db.export.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).catch(() => []),
    ]);
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    // Continue with empty data rather than crashing
  }

  const totalCommits = repositories.reduce((sum, r) => sum + r._count.commits, 0);
  const totalPRs = repositories.reduce((sum, r) => sum + r._count.pullRequests, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your compliance evidence at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Repositories"
          value={repositories.length}
          subtitle="tracked"
        />
        <StatCard
          title="Commits"
          value={totalCommits.toLocaleString()}
          subtitle="collected"
        />
        <StatCard
          title="Pull Requests"
          value={totalPRs.toLocaleString()}
          subtitle="with reviews"
        />
        <StatCard
          title="Plan"
          value={subscription?.plan === "pro" ? "Pro" : "Free"}
          subtitle={subscription?.plan === "pro" ? "unlimited exports" : "view only"}
          highlight={subscription?.plan !== "pro"}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GitHub Status */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">GitHub Connection</h2>
              {githubConnection && <SyncButton />}
            </div>

            <div className="p-5">
              {!githubConnection ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">GitHub not connected</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Sign out and sign in with GitHub to connect
                  </p>
                  <Link
                    href="/api/auth/signout"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    Sign out →
                  </Link>
                </div>
              ) : repositories.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-1">
                    Connected as <span className="text-gray-900 font-medium">{githubConnection.githubAccountLogin}</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4">No repositories selected yet</p>
                  <Link
                    href="/repositories"
                    className="inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Select repositories
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {repositories.slice(0, 4).map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{repo.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {repo._count.commits} commits · {repo._count.pullRequests} PRs
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {repo.lastSyncedAt ? (
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(repo.lastSyncedAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            Not synced
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {repositories.length > 4 && (
                    <p className="text-xs text-gray-400 text-center pt-2">
                      +{repositories.length - 4} more repositories
                    </p>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <Link
                      href="/repositories"
                      className="text-xs text-gray-500 hover:text-gray-900"
                    >
                      Manage repositories →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Quick actions</h2>
            </div>
            <div className="p-3">
              <Link
                href="/evidence"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">View Evidence</p>
                  <p className="text-xs text-gray-500">Control mapping status</p>
                </div>
              </Link>
              <Link
                href="/exports"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Export Report</p>
                  <p className="text-xs text-gray-500">PDF or CSV</p>
                </div>
              </Link>
              <Link
                href="/compliance"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Compliance Score</p>
                  <p className="text-xs text-gray-500">Coverage breakdown</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Exports */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Recent exports</h2>
            </div>
            <div className="p-3">
              {recentExports.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No exports yet
                </p>
              ) : (
                <div className="space-y-1">
                  {recentExports.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{exp.fileName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={exp.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    completed: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    pending: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status}
    </span>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}
