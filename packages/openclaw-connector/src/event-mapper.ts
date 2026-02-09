/**
 * Event Mapper
 *
 * Maps raw OpenClaw Gateway WebSocket events to the
 * normalized AuditTrail event schema.
 */

import type { NormalizedEvent, EventCategory } from "./types";
import { redactObject, redactString } from "./redactor";

/** Map OpenClaw tool names to AuditTrail event categories */
const TOOL_CATEGORY_MAP: Record<string, EventCategory> = {
  exec: "shell_exec",
  bash: "shell_exec",
  process: "shell_exec",
  apply_patch: "file_write",
  write: "file_write",
  edit: "file_write",
  read: "file_read",
  web_fetch: "network_request",
  web_search: "network_request",
  browser: "browser_action",
  canvas: "browser_action",
  sessions_send: "agent_routing",
  sessions_spawn: "agent_routing",
  agents_list: "agent_routing",
  sessions_list: "session_management",
  sessions_history: "session_management",
  session_status: "session_management",
  gateway: "system_config",
  cron: "system_config",
  image: "file_read",
  message: "agent_routing",
  nodes: "system_config",
};

/**
 * Determine if a shell command accesses credentials.
 */
function isCredentialAccess(command: string): boolean {
  const lower = command.toLowerCase();
  return (
    lower.includes("env") && (lower.includes("key") || lower.includes("secret") || lower.includes("token")) ||
    lower.includes("cat") && (lower.includes(".env") || lower.includes("credentials") || lower.includes(".ssh")) ||
    lower.includes("export") && (lower.includes("key") || lower.includes("secret") || lower.includes("token"))
  );
}

/**
 * Generate a human-readable summary for an event.
 */
function generateSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "exec":
    case "bash": {
      const cmd = (input.command as string) || "unknown command";
      const truncated = cmd.length > 100 ? cmd.slice(0, 97) + "..." : cmd;
      return `Executed shell command: ${truncated}`;
    }
    case "apply_patch":
      return `Applied patch to file(s)`;
    case "write":
      return `Wrote file: ${(input.path as string) || "unknown"}`;
    case "edit":
      return `Edited file: ${(input.path as string) || "unknown"}`;
    case "read":
      return `Read file: ${(input.path as string) || (input.file as string) || "unknown"}`;
    case "web_fetch":
      return `Fetched URL: ${(input.url as string) || "unknown"}`;
    case "web_search":
      return `Web search: ${(input.query as string) || "unknown"}`;
    case "browser":
      return `Browser action: ${(input.action as string) || "unknown"}`;
    case "sessions_send":
      return `Sent message to session: ${(input.sessionKey as string) || "unknown"}`;
    case "sessions_spawn":
      return `Spawned sub-agent: ${(input.label as string) || (input.agentId as string) || "new"}`;
    case "gateway":
      return `Gateway operation: ${(input.action as string) || "unknown"}`;
    case "cron":
      return `Cron operation: ${(input.action as string) || "unknown"}`;
    default:
      return `Tool invocation: ${toolName}`;
  }
}

/**
 * Map a raw OpenClaw event to a normalized AuditTrail event.
 */
export function mapEvent(
  toolName: string,
  input?: Record<string, unknown>,
  output?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): NormalizedEvent | null {
  let category = TOOL_CATEGORY_MAP[toolName];

  if (!category) {
    // Unknown tool — classify as session_management
    category = "session_management";
  }

  const safeInput = input ? redactObject(input) : undefined;
  const safeOutput = output ? redactObject(output) : undefined;

  // Override category for credential access patterns
  if (category === "shell_exec" && input?.command && isCredentialAccess(input.command as string)) {
    category = "credential_access";
  }

  const summary = generateSummary(toolName, input || {});

  return {
    category,
    action: toolName,
    summary: redactString(summary),
    input: safeInput,
    output: safeOutput,
    metadata: metadata ? redactObject(metadata) : undefined,
    timestamp: new Date().toISOString(),
  };
}
