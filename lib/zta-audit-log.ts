/**
 * ZTA Audit Log - structured logging for security-relevant events.
 * Implements "assume breach" principle: log everything that matters for forensics.
 */
import { logger } from "@/lib/logger";

export type ZtaEventType =
  | "auth.session_start"
  | "auth.session_end"
  | "auth.auditor_token_used"
  | "auth.auditor_token_expired"
  | "authz.org_mismatch"
  | "authz.plan_limit_exceeded"
  | "webhook.signature_valid"
  | "webhook.signature_invalid"
  | "export.initiated"
  | "export.completed"
  | "admin.settings_changed";

interface ZtaAuditEvent {
  event: ZtaEventType;
  orgId?: string;
  userId?: string;
  ip?: string;
  detail?: Record<string, unknown>;
}

export function ztaLog(evt: ZtaAuditEvent): void {
  logger.info(`[ZTA] ${evt.event}`, {
    ...evt,
    ts: new Date().toISOString(),
  });
}
