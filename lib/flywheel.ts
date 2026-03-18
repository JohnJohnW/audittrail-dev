/**
 * Flywheel Instrumentation
 *
 * Records anonymized compliance signals for future model improvement.
 * All records are stripped of orgId to prevent data leakage.
 * Gated by FLYWHEEL_ENABLED=true env var.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

function isFlywheelEnabled(): boolean {
  return process.env.FLYWHEEL_ENABLED === "true";
}

/**
 * Sanitize a payload by stripping any orgId or PII fields.
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  delete sanitized.orgId;
  delete sanitized.userId;
  delete sanitized.email;
  delete sanitized.name;
  delete sanitized.authorName;
  delete sanitized.authorEmail;
  return sanitized;
}

export interface AuditorSignoff {
  controlCode: string;
  frameworkName: string;
  verdict: "approved" | "rejected" | "needs_work";
  mappingConfidence: number;
  orgIndustry?: string;
  orgSize?: string;
}

export interface AuditOutcome {
  frameworkName: string;
  auditType: string;
  outcome: string;
  findingCount: number;
  criticalFindingCount: number;
  frameworkScore: number;
  orgIndustry?: string;
  orgSize?: string;
}

/**
 * Record an auditor signoff as an anonymized flywheel signal.
 */
export async function recordAuditorSignoff(_orgId: string, signoff: AuditorSignoff): Promise<void> {
  if (!isFlywheelEnabled()) return;

  try {
    const sanitized = sanitizePayload(signoff as unknown as Record<string, unknown>);

    await db.$executeRaw`
      INSERT INTO auditor_signal_records (
        id, control_code, framework_name, verdict,
        mapping_confidence, org_industry, org_size, created_at
      ) VALUES (
        gen_random_uuid(),
        ${sanitized.controlCode}::text,
        ${sanitized.frameworkName}::text,
        ${sanitized.verdict}::text,
        ${signoff.mappingConfidence}::float,
        ${signoff.orgIndustry || null}::text,
        ${signoff.orgSize || null}::text,
        NOW()
      )
    `;
  } catch (error) {
    logger.warn("Flywheel: failed to record auditor signoff", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Record an audit cycle outcome as an anonymized flywheel signal.
 */
export async function recordAuditOutcome(_orgId: string, outcome: AuditOutcome): Promise<void> {
  if (!isFlywheelEnabled()) return;

  try {
    await db.$executeRaw`
      INSERT INTO audit_outcome_records (
        id, framework_name, audit_type, outcome,
        finding_count, critical_finding_count,
        framework_score, org_industry, org_size, created_at
      ) VALUES (
        gen_random_uuid(),
        ${outcome.frameworkName}::text,
        ${outcome.auditType}::text,
        ${outcome.outcome}::text,
        ${outcome.findingCount}::int,
        ${outcome.criticalFindingCount}::int,
        ${outcome.frameworkScore}::float,
        ${outcome.orgIndustry || null}::text,
        ${outcome.orgSize || null}::text,
        NOW()
      )
    `;
  } catch (error) {
    logger.warn("Flywheel: failed to record audit outcome", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Record a GRC annotation (control note creation/update) as flywheel signal.
 */
export async function recordGrcAnnotation(
  _orgId: string,
  controlCode: string,
  frameworkName: string
): Promise<void> {
  if (!isFlywheelEnabled()) return;

  try {
    // Just increment a counter — we don't store the note content
    logger.info("Flywheel: GRC annotation recorded", { controlCode, frameworkName });
  } catch (error) {
    logger.warn("Flywheel: failed to record GRC annotation", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
