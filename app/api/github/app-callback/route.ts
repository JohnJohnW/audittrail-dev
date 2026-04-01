import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GitHub App installation callback.
 *
 * GitHub redirects here after a user installs or updates the GitHub App.
 * Query params:
 *   - installation_id: the numeric ID of the new installation
 *   - setup_action: "install" | "update" | "delete"
 *   - code: OAuth code (present when "Request user authorization during installation" is enabled)
 *
 * We store the installation_id on the org's github_connections row so that
 * the webhook handler can resolve org → installation and future API calls can
 * use installation tokens instead of user OAuth tokens.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action") ?? "install";

  // Always redirect to dashboard - never leave user on a blank callback page
  const dashboardUrl = new URL("/dashboard", request.url);
  const errorUrl = new URL("/dashboard?github_app_error=1", request.url);

  if (!installationId) {
    logger.warn("GitHub App callback: missing installation_id");
    return NextResponse.redirect(errorUrl);
  }

  const installationIdInt = parseInt(installationId, 10);
  if (isNaN(installationIdInt)) {
    logger.warn("GitHub App callback: invalid installation_id format");
    return NextResponse.redirect(errorUrl);
  }

  // Require the user to be signed in
  const session = await auth();
  if (!session?.user || !session.orgId) {
    // Not signed in - redirect to sign-in, then back to dashboard
    const signInUrl = new URL("/auth/signin", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const orgId = session.orgId;

  try {
    if (setupAction === "delete") {
      // App uninstalled - clear installation_id
      await db.gitHubConnection.updateMany({
        where: { orgId, installationId: installationIdInt },
        data: { installationId: null },
      });
      logger.info(`GitHub App uninstalled for org ${orgId}, installation ${installationIdInt}`);
      return NextResponse.redirect(dashboardUrl);
    }

    // install or update - upsert the installation_id
    const existing = await db.gitHubConnection.findFirst({
      where: { orgId },
      select: { id: true },
    });

    if (existing) {
      await db.gitHubConnection.update({
        where: { id: existing.id },
        data: { installationId: installationIdInt },
      });
    } else {
      // No connection row yet - this shouldn't normally happen since OAuth
      // creates it, but handle it gracefully
      logger.warn(
        `GitHub App callback: no github_connection found for org ${orgId}, ` +
          `installation ${installationIdInt}. User may need to sign in with GitHub first.`
      );
      return NextResponse.redirect(
        new URL("/dashboard?github_app_error=no_connection", request.url)
      );
    }

    logger.info(`GitHub App ${setupAction}ed for org ${orgId}, installation ${installationIdInt}`);

    return NextResponse.redirect(new URL("/dashboard?github_app_installed=1", request.url));
  } catch (error) {
    logger.error("GitHub App callback: error saving installation_id", error);
    return NextResponse.redirect(errorUrl);
  }
}
