import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, { status: "healthy" | "degraded" | "unhealthy"; message?: string }> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy" };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // GitHub API check (basic connectivity)
  try {
    const response = await fetch("https://api.github.com", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    checks.github = response.ok
      ? { status: "healthy" }
      : { status: "degraded", message: `GitHub API returned ${response.status}` };
  } catch (error) {
    checks.github = {
      status: "degraded",
      message: error instanceof Error ? error.message : "GitHub API unreachable",
    };
  }

  const overallStatus =
    Object.values(checks).every((c) => c.status === "healthy")
      ? "healthy"
      : Object.values(checks).some((c) => c.status === "unhealthy")
      ? "unhealthy"
      : "degraded";

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
