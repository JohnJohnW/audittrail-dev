import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SyncButton } from "@/components/dashboard/SyncButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const orgId = session.orgId;

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No organization found
        </h2>
        <p className="text-gray-600 mb-4">
          Please sign out and sign in again to create your organization.
        </p>
      </div>
    );
  }

  // Get organization data
  const [
    githubConnection,
    repositories,
    subscription,
    recentExports,
  ] = await Promise.all([
    db.gitHubConnection.findUnique({ where: { orgId } }),
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
    }),
    db.subscription.findUnique({ where: { orgId } }),
    db.export.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalCommits = repositories.reduce((sum, r) => sum + r._count.commits, 0);
  const totalPRs = repositories.reduce((sum, r) => sum + r._count.pullRequests, 0);
  const lastSync = repositories.reduce((latest, r) => {
    if (!r.lastSyncedAt) return latest;
    if (!latest) return r.lastSyncedAt;
    return r.lastSyncedAt > latest ? r.lastSyncedAt : latest;
  }, null as Date | null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your compliance evidence collection
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Repositories"
          value={repositories.length}
          subtitle="Being tracked"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Commits"
          value={totalCommits}
          subtitle="Collected"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pull Requests"
          value={totalPRs}
          subtitle="With reviews"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        />
        <StatCard
          title="Plan"
          value={subscription?.plan === "pro" ? "Pro" : "Free"}
          subtitle={subscription?.plan === "pro" ? "Unlimited exports" : "3 repos, no exports"}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GitHub Status */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">GitHub Connection</h2>
              {githubConnection && <SyncButton />}
            </div>

            {!githubConnection ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">GitHub not connected</p>
                <p className="text-sm text-gray-500 mb-4">
                  Sign out and sign in with GitHub to connect your repositories.
                </p>
                <Link
                  href="/api/auth/signout"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Sign out to reconnect
                </Link>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Connected as <span className="font-medium">{githubConnection.githubAccountLogin}</span>
                </p>
                <Link
                  href="/repositories"
                  className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Select Repositories
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{repo.fullName}</p>
                      <p className="text-sm text-gray-500">
                        {repo._count.commits} commits, {repo._count.pullRequests} PRs
                      </p>
                    </div>
                    <div className="text-right">
                      {repo.lastSyncedAt ? (
                        <p className="text-xs text-gray-500">
                          Last sync: {new Date(repo.lastSyncedAt).toLocaleString()}
                        </p>
                      ) : (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                          Never synced
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <Link
                  href="/repositories"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Manage repositories
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/evidence"
                className="block w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">View Evidence</p>
                <p className="text-sm text-gray-500">See compliance control mapping</p>
              </Link>
              <Link
                href="/exports"
                className="block w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Export Report</p>
                <p className="text-sm text-gray-500">Generate PDF or CSV</p>
              </Link>
            </div>
          </div>

          {/* Recent Exports */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h2>
            {recentExports.length === 0 ? (
              <p className="text-sm text-gray-500">No exports yet</p>
            ) : (
              <div className="space-y-3">
                {recentExports.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{exp.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      exp.status === "completed" ? "bg-green-50 text-green-700" :
                      exp.status === "failed" ? "bg-red-50 text-red-700" :
                      "bg-yellow-50 text-yellow-700"
                    }`}>
                      {exp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
