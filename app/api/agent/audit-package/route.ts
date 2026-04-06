/**
 * Audit Package API
 *
 * POST: Assemble a structured audit evidence package from a completed agent run
 */

import { NextResponse } from "next/server";
import { requireAuth, parseBodyWithSchema } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { z } from "zod";
import { assembleAuditPackage } from "@/lib/agent/audit-package";

export const dynamic = "force-dynamic";

const AuditPackageSchema = z.object({
  agentRunId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { orgId } = await requireAuth();

    const body = await parseBodyWithSchema(request, AuditPackageSchema);

    const auditPackage = await assembleAuditPackage({
      orgId,
      agentRunId: body.agentRunId,
    });

    return NextResponse.json({ auditPackage });
  } catch (error) {
    return handleApiError(error);
  }
}
