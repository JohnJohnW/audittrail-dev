import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, parseOptionalJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { getGitHubClientForOrg } from "@/lib/github";
import { isValidCuid } from "@/lib/utils";
import { handleApiError, AppError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { syncRepository } from "@/lib/github-sync";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    // Rate-limit manual syncs per org (5/minute — same bucket as the sync limiter)
    const { success: withinLimit } = await checkRateLimit(orgId, "sync");
    if (!withinLimit) {
      throw new AppError(
        "Sync rate limit reached — please wait before syncing again",
        429,
        "RATE_LIMITED"
      );
    }

    const body = await parseOptionalJsonBody<{ repositoryId?: string }>(request);
    const repositoryId = body?.repositoryId;

    // Validate repositoryId format if provided
    if (repositoryId && !isValidCuid(repositoryId)) {
      throw new AppError("Invalid repositoryId format", 400, "INVALID_ID");
    }

    const client = await getGitHubClientForOrg(orgId);
    if (!client) {
      throw new AppError("GitHub not connected", 400, "GITHUB_NOT_CONNECTED");
    }

    // Get repositories to sync
    const whereClause = repositoryId
      ? { id: repositoryId, orgId, isActive: true }
      : { orgId, isActive: true };

    const repositories = await db.repository.findMany({
      where: whereClause,
    });

    if (repositories.length === 0) {
      throw new AppError("No repositories to sync", 400, "NO_REPOSITORIES");
    }

    const results = await Promise.all(
      repositories.map((repo) => {
        logger.info(`Syncing repository: ${repo.fullName}`);
        return syncRepository(client, repo);
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { orgId } = await requireAuth();

    // Get sync status for all repositories
    const repositories = await db.repository.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        fullName: true,
        lastSyncedAt: true,
        _count: {
          select: {
            commits: true,
            pullRequests: true,
            branchProtections: true,
          },
        },
      },
    });

    return NextResponse.json({
      repositories: repositories.map((repo) => ({
        id: repo.id,
        fullName: repo.fullName,
        lastSyncedAt: repo.lastSyncedAt,
        commitCount: repo._count.commits,
        pullRequestCount: repo._count.pullRequests,
        hasBranchProtection: repo._count.branchProtections > 0,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
