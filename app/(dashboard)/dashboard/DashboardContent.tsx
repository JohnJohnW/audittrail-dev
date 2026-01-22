"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { FadeIn } from "@/components/ui/Motion";

interface Repository {
  id: string;
  fullName: string;
  lastSyncedAt: Date | null;
  _count: { commits: number; pullRequests: number };
}

interface GitHubConnection {
  githubAccountLogin: string;
}

interface Subscription {
  plan: string;
}

interface Export {
  id: string;
  fileName: string;
  status: string;
  createdAt: Date;
}

interface DashboardContentProps {
  repositories: Repository[];
  githubConnection: GitHubConnection | null;
  subscription: Subscription | null;
  recentExports: Export[];
  totalCommits: number;
  totalPRs: number;
}

export function DashboardContent({
  repositories,
  githubConnection,
  subscription,
  recentExports,
  totalCommits,
  totalPRs,
}: DashboardContentProps) {
  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Your compliance evidence at a glance</p>
        </div>
      </FadeIn>

      {/* Stats Grid */}
      <FadeIn delay={0.1}>
        <StatCardGrid columns={{ default: 2, lg: 4 }} className="mb-6 sm:mb-8">
          <StatCard
            label="Repositories"
            value={repositories.length}
            subtitle="tracked"
            icon={<RepoIcon />}
          />
          <StatCard
            label="Commits"
            value={totalCommits.toLocaleString()}
            subtitle="collected"
            icon={<CommitIcon />}
          />
          <StatCard
            label="Pull Requests"
            value={totalPRs.toLocaleString()}
            subtitle="with reviews"
            icon={<PRIcon />}
          />
          <StatCard
            label="Plan"
            value={subscription?.plan === "pro" ? "Pro" : "Free"}
            subtitle={subscription?.plan === "pro" ? "unlimited exports" : "view only"}
            highlight={subscription?.plan !== "pro"}
            icon={<PlanIcon />}
          />
        </StatCardGrid>
      </FadeIn>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GitHub Status */}
        <FadeIn delay={0.2} className="lg:col-span-2">
          <Card variant="elevated">
            <CardHeader action={githubConnection && <SyncButton />}>
              <CardTitle>GitHub Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {!githubConnection ? (
                <EmptyGitHubState />
              ) : repositories.length === 0 ? (
                <NoReposState githubLogin={githubConnection.githubAccountLogin} />
              ) : (
                <RepositoryList repositories={repositories} />
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="-mx-2">
                <QuickActionLink
                  href="/evidence"
                  icon={<ShieldIcon />}
                  title="View Evidence"
                  subtitle="Control mapping status"
                />
                <QuickActionLink
                  href="/exports"
                  icon={<ExportIcon />}
                  title="Export Report"
                  subtitle="PDF or CSV"
                />
                <QuickActionLink
                  href="/compliance"
                  icon={<ChartIcon />}
                  title="Compliance Score"
                  subtitle="Coverage breakdown"
                />
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.4}>
            <Card>
              <CardHeader>
                <CardTitle>Recent Exports</CardTitle>
              </CardHeader>
              <CardContent>
                {recentExports.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No exports yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentExports.map((exp) => (
                      <motion.div
                        key={exp.id}
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {exp.fileName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(exp.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ExportStatusBadge status={exp.status} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

// Sub-components

function EmptyGitHubState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
        <GitHubIcon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">GitHub not connected</p>
      <p className="text-xs text-gray-500 mb-4">Sign out and sign in with GitHub to connect</p>
      <Button variant="secondary" href="/api/auth/signout" size="sm">
        Sign out →
      </Button>
    </div>
  );
}

function NoReposState({ githubLogin }: { githubLogin: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-500 mb-1">
        Connected as <span className="text-gray-900 font-semibold">{githubLogin}</span>
      </p>
      <p className="text-xs text-gray-400 mb-4">No repositories selected yet</p>
      <Button href="/repositories" variant="accent">
        Select repositories
      </Button>
    </div>
  );
}

function RepositoryList({ repositories }: { repositories: Repository[] }) {
  return (
    <div className="space-y-1">
      {repositories.slice(0, 4).map((repo, index) => (
        <motion.div
          key={repo.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 4, backgroundColor: "rgba(0,0,0,0.02)" }}
          className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{repo.fullName}</p>
            <p className="text-xs text-gray-500">
              {repo._count.commits} commits · {repo._count.pullRequests} PRs
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            {repo.lastSyncedAt ? (
              <span className="text-xs text-gray-400">{formatRelativeTime(repo.lastSyncedAt)}</span>
            ) : (
              <Badge variant="warning" size="sm">
                Not synced
              </Badge>
            )}
          </div>
        </motion.div>
      ))}
      {repositories.length > 4 && (
        <p className="text-xs text-gray-400 text-center pt-2">
          +{repositories.length - 4} more repositories
        </p>
      )}
      <div className="pt-3 border-t border-gray-100 mt-2">
        <Link
          href="/repositories"
          className="text-sm text-gray-500 hover:text-accent transition-colors font-medium"
        >
          Manage repositories →
        </Link>
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4, backgroundColor: "rgba(0,0,0,0.02)" }}
        className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function ExportStatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "success" : status === "failed" ? "error" : "warning";
  return (
    <Badge variant={variant} size="sm">
      {status}
    </Badge>
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

// Icons
function RepoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function CommitIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function PRIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
