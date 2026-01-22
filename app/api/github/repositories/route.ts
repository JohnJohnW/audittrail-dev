import { NextResponse } from "next/server";
import { requireAuth, parseJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { getGitHubClientForOrg } from "@/lib/github";
import { handleApiError, AppError } from "@/lib/error-handler";
import { PLAN_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Get GitHub connection
    const connection = await db.gitHubConnection.findUnique({
      where: { orgId },
    });

    if (!connection) {
      return NextResponse.json({ connected: false, repositories: [] });
    }

    // Get repositories from GitHub
    const client = await getGitHubClientForOrg(orgId);
    if (!client) {
      logger.warn("GitHub client creation failed", { orgId });
      return NextResponse.json({
        connected: false,
        repositories: [],
        error: "GitHub connection invalid. Please reconnect.",
      });
    }

    let githubRepos;
    try {
      githubRepos = await client.getAllRepositories();
    } catch (error) {
      // If GitHub API call fails, connection might be invalid
      logger.error("Failed to fetch GitHub repositories", error, { orgId });
      return NextResponse.json({
        connected: false,
        repositories: [],
        error: "GitHub connection invalid. Please reconnect.",
      });
    }

    // Get tracked repos from database
    const trackedRepos = await db.repository.findMany({
      where: { orgId },
      select: { githubRepoId: true, isActive: true },
    });
    const trackedMap = new Map(trackedRepos.map((r) => [r.githubRepoId.toString(), r.isActive]));

    const repositories = githubRepos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      description: repo.description,
      pushedAt: repo.pushed_at,
      isTracked: trackedMap.has(repo.id.toString()),
      isActive: trackedMap.get(repo.id.toString()) ?? false,
    }));

    return NextResponse.json({
      connected: true,
      githubAccount: connection.githubAccountLogin,
      repositories,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

interface UpdateReposBody {
  repositoryIds: number[];
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireAuth();
    const { repositoryIds } = await parseJsonBody<UpdateReposBody>(request);

    if (!Array.isArray(repositoryIds)) {
      throw new AppError("repositoryIds must be an array", 400, "INVALID_REQUEST");
    }

    // Validate all IDs are numbers
    if (!repositoryIds.every((id) => typeof id === "number")) {
      throw new AppError("All repositoryIds must be numbers", 400, "INVALID_REQUEST");
    }

    // Check subscription limits
    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    const maxRepos =
      subscription?.plan === "pro" ? PLAN_LIMITS.PRO_REPO_LIMIT : PLAN_LIMITS.FREE_REPO_LIMIT;
    if (repositoryIds.length > maxRepos) {
      throw new AppError(
        `Free plan is limited to ${PLAN_LIMITS.FREE_REPO_LIMIT} repositories. Upgrade to Pro for unlimited.`,
        403,
        "PLAN_LIMIT_EXCEEDED"
      );
    }

    // Get GitHub client
    const client = await getGitHubClientForOrg(orgId);
    if (!client) {
      throw new AppError("GitHub not connected", 400, "GITHUB_NOT_CONNECTED");
    }

    // Get all repos to verify the selected ones exist
    const githubRepos = await client.getAllRepositories();
    const repoMap = new Map(githubRepos.map((r) => [r.id, r]));

    // Deactivate all current repos first
    await db.repository.updateMany({
      where: { orgId },
      data: { isActive: false },
    });

    // Upsert selected repos
    for (const repoId of repositoryIds) {
      const githubRepo = repoMap.get(repoId);
      if (!githubRepo) continue;

      await db.repository.upsert({
        where: { githubRepoId: BigInt(repoId) },
        update: { isActive: true },
        create: {
          orgId,
          githubRepoId: BigInt(repoId),
          name: githubRepo.name,
          fullName: githubRepo.full_name,
          defaultBranch: githubRepo.default_branch,
          isPrivate: githubRepo.private,
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
