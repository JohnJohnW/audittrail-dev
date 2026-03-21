import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardContent } from "./DashboardContent";
import { logger } from "@/lib/logger";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    logger.error("Auth error", error);
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

  const data = await getDashboardData(orgId).catch((error) => {
    logger.error("Dashboard data fetch error", error);
    return null;
  });

  // Redirect brand-new users (no GitHub connection AND no tracked repos) to the
  // onboarding wizard. The ?skip=1 query param lets users bypass this after they
  // have explicitly dismissed onboarding. We check the URL here because
  // localStorage is not accessible in Server Components.
  const headersList = await headers();
  const referer = headersList.get("referer") ?? "";
  const isFromOnboarding = referer.includes("/onboarding");
  const hasGithubConnection = data?.githubConnection != null;
  const hasRepos = (data?.repositories?.length ?? 0) > 0;
  const isNewUser = !hasGithubConnection && !hasRepos;

  if (isNewUser && !isFromOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardContent
      repositories={data?.repositories ?? []}
      githubConnection={data?.githubConnection ?? null}
      githubConnectionFetchFailed={data?.githubConnectionFetchFailed ?? false}
      subscription={data?.subscription ?? null}
      recentExports={data?.recentExports ?? []}
      totalCommits={data?.totalCommits ?? 0}
      totalPRs={data?.totalPRs ?? 0}
      complianceScore={data?.complianceScore ?? null}
      scoreDelta={data?.scoreDelta ?? null}
      weakestFramework={data?.weakestFramework ?? null}
      lastSyncedAt={data?.lastSyncedAt ?? null}
      remediationVelocity={data?.remediationVelocity ?? null}
    />
  );
}
