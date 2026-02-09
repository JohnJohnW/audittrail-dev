/**
 * Shared types for the AuditTrail OpenClaw connector.
 */

export type EventCategory =
  | "shell_exec"
  | "file_write"
  | "file_read"
  | "network_request"
  | "browser_action"
  | "credential_access"
  | "session_management"
  | "agent_routing"
  | "system_config";

export interface NormalizedEvent {
  category: EventCategory;
  action: string;
  summary: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface IngestPayload {
  sessionId: string;
  agentFramework: "openclaw";
  agentId?: string;
  sessionStatus?: "running" | "completed" | "failed" | "timeout";
  sessionSummary?: string;
  events: NormalizedEvent[];
}

export interface ConnectorConfig {
  apiKey: string;
  apiUrl: string;
  gatewayUrl: string;
  gatewayToken?: string;
  batchIntervalMs: number;
  bufferPath: string;
  maxRetries: number;
  verbose: boolean;
}

export const DEFAULT_CONFIG: Omit<ConnectorConfig, "apiKey"> = {
  apiUrl: "https://audittrail-dev.vercel.app",
  gatewayUrl: "ws://127.0.0.1:18789",
  batchIntervalMs: 5000,
  bufferPath: "",
  maxRetries: 3,
  verbose: false,
};
