import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getControlBenchmark } from "@/lib/benchmarks";
import { handleApiError, AppError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/benchmarks/controls?framework=X&controlCode=Y
 * Returns the industry benchmark for one control, scoped to the org's cohort.
 *
 * Response:
 *   { benchmark: { passRate, p50, sampleCount, orgPasses } }
 *   or { benchmark: null } when no cohort data exists yet.
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();
    const { searchParams } = request.nextUrl;
    const framework = searchParams.get("framework");
    const controlCode = searchParams.get("controlCode");

    if (!framework) throw new AppError("framework query param required", 400, "INVALID_REQUEST");
    if (!controlCode)
      throw new AppError("controlCode query param required", 400, "INVALID_REQUEST");

    const benchmark = await getControlBenchmark(orgId, framework, controlCode);
    return NextResponse.json({ benchmark });
  } catch (error) {
    return handleApiError(error);
  }
}
