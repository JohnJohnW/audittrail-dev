import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGitHubClientForOrg } from "@/lib/github";
import { handleApiError } from "@/lib/error-handler";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

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
      return NextResponse.json({ connected: false, repositories: [] });
    }

    const githubRepos = await client.getAllRepositories();

    // Get tracked repos from database
    const trackedRepos = await db.repository.findMany({
      where: { orgId },
      select: { githubRepoId: true, isActive: true },
    });
    const trackedMap = new Map(
      trackedRepos.map((r) => [r.githubRepoId.toString(), r.isActive])
    );

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
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { repositoryIds } = body as { repositoryIds: number[] };

    if (!Array.isArray(repositoryIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Check subscription limits
    const subscription = await db.subscription.findUnique({
      where: { orgId },
    });

    const maxRepos = subscription?.plan === "pro" ? Infinity : 3;
    if (repositoryIds.length > maxRepos) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${maxRepos} repositories. Upgrade to Pro for unlimited.`,
        },
        { status: 403 }
      );
    }

    // Get GitHub client
    const client = await getGitHubClientForOrg(orgId);
    if (!client) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
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
    console.error("Error saving repositories:", error);
    return NextResponse.json(
      { error: "Failed to save repositories" },
      { status: 500 }
    );
  }
}
