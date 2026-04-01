/**
 * Calculation Engine Config API
 *
 * GET:  Return org config merged with system defaults (shows what's overridden vs default).
 * PUT:  Update org calc config (admin/owner only).
 */

import { NextResponse } from "next/server";
import { requireAuth, parseJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/error-handler";
import { loadOrgConfig } from "@/lib/calc-engine/config";
import { DEFAULTS } from "@/lib/calc-engine/defaults";
import type { OrgCalcOverrides } from "@/lib/calc-engine/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireAuth();
    const orgConfig = await loadOrgConfig(orgId);

    // Return both the org overrides and the resolved (merged) values so the UI
    // can show which fields are using defaults vs. org-configured values.
    return NextResponse.json({
      overrides: orgConfig,
      defaults: DEFAULTS,
      resolved: {
        scoring: {
          partialWeight: orgConfig.scoring?.partialWeight ?? DEFAULTS.scoring.partialWeight,
          frameworkWeights: {
            ...DEFAULTS.scoring.frameworkWeights,
            ...(orgConfig.scoring?.frameworkWeights ?? {}),
          },
        },
        businessImpact: {
          breachBaseline:
            orgConfig.businessImpact?.breachBaseline ?? DEFAULTS.businessImpact.breachBaseline,
          gapEscalationRate:
            orgConfig.businessImpact?.gapEscalationRate ??
            DEFAULTS.businessImpact.gapEscalationRate,
          companySizeMultipliers: {
            ...DEFAULTS.businessImpact.companySizeMultipliers,
            ...(orgConfig.businessImpact?.companySizeMultipliers ?? {}),
          },
          industryMultipliers: {
            ...DEFAULTS.businessImpact.industryMultipliers,
            ...(orgConfig.businessImpact?.industryMultipliers ?? {}),
          },
        },
        auditReadiness: {
          thresholds: orgConfig.auditReadiness?.thresholds ?? DEFAULTS.auditReadiness.thresholds,
          dealBlocker: {
            ...DEFAULTS.auditReadiness.dealBlocker,
            ...(orgConfig.auditReadiness?.dealBlocker ?? {}),
          },
          predictedOutcome: {
            ...DEFAULTS.auditReadiness.predictedOutcome,
            ...(orgConfig.auditReadiness?.predictedOutcome ?? {}),
          },
        },
        gapAnalysis: {
          effortEstimates: {
            ...DEFAULTS.gapAnalysis.effortEstimates,
            ...(orgConfig.gapAnalysis?.effortEstimates ?? {}),
          },
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { orgId, orgRole } = await requireAuth();

    // Only admin/owner can change calc config
    if (orgRole !== "admin" && orgRole !== "owner") {
      throw new AppError(
        "Only org admins and owners can update calculation settings",
        403,
        "FORBIDDEN"
      );
    }

    const body = await parseJsonBody<OrgCalcOverrides>(request);

    // Basic validation: reject obviously wrong values
    if (body.scoring?.partialWeight !== undefined) {
      const w = body.scoring.partialWeight;
      if (typeof w !== "number" || w < 0 || w > 1) {
        throw new AppError("partialWeight must be a number between 0 and 1", 400, "INVALID_INPUT");
      }
    }
    if (body.businessImpact?.breachBaseline !== undefined) {
      const b = body.businessImpact.breachBaseline;
      if (typeof b !== "number" || b < 0) {
        throw new AppError("breachBaseline must be a positive number", 400, "INVALID_INPUT");
      }
    }
    if (body.businessImpact?.gapEscalationRate !== undefined) {
      const r = body.businessImpact.gapEscalationRate;
      if (typeof r !== "number" || r < 0 || r > 1) {
        throw new AppError(
          "gapEscalationRate must be a number between 0 and 1",
          400,
          "INVALID_INPUT"
        );
      }
    }

    // Upsert org calc config. JSON.parse(JSON.stringify()) gives a plain value
    // that satisfies Prisma's InputJsonValue constraint
    const configJson = JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue;
    await db.orgCalcConfig.upsert({
      where: { orgId },
      create: { orgId, config: configJson },
      update: { config: configJson },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
