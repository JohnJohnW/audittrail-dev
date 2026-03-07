import { NextResponse } from "next/server";
import { db, getConnectionPoolMetrics } from "@/lib/db";

// Health check endpoint — intentionally returns minimal information.
// Internal details (error messages, pool metrics) are determined server-side
// but never included in the response to avoid leaking system internals.
export async function GET() {
  const statuses: ("healthy" | "degraded" | "unhealthy")[] = [];

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    const poolMetrics = getConnectionPoolMetrics();
    statuses.push(poolMetrics.hasRecentErrors ? "degraded" : "healthy");
  } catch {
    statuses.push("unhealthy");
  }

  // GitHub API reachability check
  try {
    const response = await fetch("https://api.github.com", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    statuses.push(response.ok ? "healthy" : "degraded");
  } catch {
    statuses.push("degraded");
  }

  const overallStatus = statuses.every((s) => s === "healthy")
    ? "healthy"
    : statuses.some((s) => s === "unhealthy")
      ? "unhealthy"
      : "degraded";

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
