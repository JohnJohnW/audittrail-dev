import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

    const [githubConnection, repositories] = await Promise.all([
      db.gitHubConnection.findUnique({ where: { orgId } }),
      db.repository.findMany({
        where: { orgId, isActive: true },
        take: 1,
      }),
    ]);

    const steps = [
      {
        id: "connect_github",
        title: "Connect GitHub",
        description:
          "Connect your GitHub account to start tracking repositories.",
        completed: !!githubConnection,
        action: githubConnection
          ? undefined
          : {
              label: "Connect GitHub",
              href: "/api/auth/signin/github",
            },
      },
      {
        id: "select_repos",
        title: "Select Repositories",
        description:
          "Choose which repositories you want to track for compliance evidence.",
        completed: repositories.length > 0,
        action:
          repositories.length > 0
            ? undefined
            : {
                label: "Select Repositories",
                href: "/repositories",
              },
      },
      {
        id: "first_sync",
        title: "Run First Sync",
        description:
          "Sync your repositories to collect compliance evidence for the first time.",
        completed: repositories.some((r) => r.lastSyncedAt !== null),
        action: repositories.some((r) => r.lastSyncedAt !== null)
          ? undefined
          : {
              label: "Sync Repositories",
              href: "/repositories",
            },
      },
    ];

    return NextResponse.json({ steps });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stepId } = body;

    // Step completion is tracked implicitly through data state
    // This endpoint can be used for future analytics or custom steps
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
