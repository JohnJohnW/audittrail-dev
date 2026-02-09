#!/usr/bin/env node

/**
 * AuditTrail OpenClaw Connector
 *
 * A lightweight CLI that connects to the OpenClaw Gateway,
 * captures agent activity, and ships it to AuditTrail.dev
 * for governance and compliance auditing.
 *
 * Usage:
 *   audittrail-connect --api-key atk_xxx
 *   audittrail-connect --api-key atk_xxx --gateway ws://localhost:18789
 */

import { GatewayListener } from "./gateway-listener";
import { OfflineBuffer } from "./buffer";
import { Shipper } from "./shipper";
import type { ConnectorConfig, NormalizedEvent, IngestPayload } from "./types";
import { DEFAULT_CONFIG } from "./types";

// ─── CLI Argument Parsing ──────────────────────────────────────────

function parseArgs(args: string[]): Partial<ConnectorConfig> & { help?: boolean } {
  const config: Partial<ConnectorConfig> & { help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--api-key":
      case "-k":
        config.apiKey = next;
        i++;
        break;
      case "--api-url":
        config.apiUrl = next;
        i++;
        break;
      case "--gateway":
      case "-g":
        config.gatewayUrl = next;
        i++;
        break;
      case "--gateway-token":
        config.gatewayToken = next;
        i++;
        break;
      case "--batch-interval":
        config.batchIntervalMs = parseInt(next, 10);
        i++;
        break;
      case "--verbose":
      case "-v":
        config.verbose = true;
        break;
      case "--help":
      case "-h":
        config.help = true;
        break;
    }
  }

  return config;
}

function printUsage(): void {
  console.log(`
AuditTrail OpenClaw Connector v0.1.0

Usage:
  audittrail-connect --api-key <key> [options]

Options:
  --api-key, -k <key>       AuditTrail API key (required)
  --api-url <url>           AuditTrail API URL (default: ${DEFAULT_CONFIG.apiUrl})
  --gateway, -g <url>       OpenClaw Gateway WebSocket URL (default: ${DEFAULT_CONFIG.gatewayUrl})
  --gateway-token <token>   OpenClaw Gateway auth token
  --batch-interval <ms>     Event batch interval in ms (default: ${DEFAULT_CONFIG.batchIntervalMs})
  --verbose, -v             Enable verbose logging
  --help, -h                Show this help message

Example:
  audittrail-connect --api-key atk_abc123def456 --verbose
`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.help) {
    printUsage();
    process.exit(0);
  }

  if (!parsedArgs.apiKey) {
    console.error("Error: --api-key is required\n");
    printUsage();
    process.exit(1);
  }

  if (!parsedArgs.apiKey.startsWith("atk_")) {
    console.error("Error: API key must start with 'atk_'\n");
    process.exit(1);
  }

  const config: ConnectorConfig = {
    ...DEFAULT_CONFIG,
    ...parsedArgs,
    apiKey: parsedArgs.apiKey,
  };

  console.log("┌─────────────────────────────────────────┐");
  console.log("│   AuditTrail OpenClaw Connector v0.1.0  │");
  console.log("└─────────────────────────────────────────┘");
  console.log(`  API:     ${config.apiUrl}`);
  console.log(`  Gateway: ${config.gatewayUrl}`);
  console.log(`  Batch:   ${config.batchIntervalMs}ms`);
  console.log("");

  // Initialize components
  const buffer = new OfflineBuffer(config.bufferPath || undefined);
  const shipper = new Shipper(config.apiUrl, config.apiKey, config.maxRetries, buffer, config.verbose);

  // Event batch accumulator
  const pendingEvents = new Map<string, NormalizedEvent[]>();
  const sessionStatuses = new Map<string, { status: string; summary?: string }>();

  // Flush buffered events from previous runs
  if (buffer.hasBuffered()) {
    const bufferedCount = buffer.count();
    console.log(`  ↻ Flushing ${bufferedCount} buffered payload(s) from previous run...`);
    const shipped = await shipper.flushBuffer();
    console.log(`  ✓ Flushed ${shipped}/${bufferedCount} payload(s)`);
    console.log("");
  }

  // Set up the Gateway listener
  const listener = new GatewayListener(
    config,
    // On event
    (sessionId: string, event: NormalizedEvent) => {
      if (!pendingEvents.has(sessionId)) {
        pendingEvents.set(sessionId, []);
      }
      pendingEvents.get(sessionId)!.push(event);

      if (config.verbose) {
        const riskIndicator =
          event.category === "credential_access" || event.category === "system_config"
            ? "⚠"
            : "·";
        console.log(`  ${riskIndicator} [${sessionId.slice(0, 8)}] ${event.summary}`);
      }
    },
    // On session status change
    (sessionId: string, status: string, summary?: string) => {
      sessionStatuses.set(sessionId, { status, summary });
      if (config.verbose) {
        console.log(`  ○ [${sessionId.slice(0, 8)}] Session ${status}`);
      }
    }
  );

  // Batch shipper interval
  const batchInterval = setInterval(async () => {
    for (const [sessionId, events] of pendingEvents.entries()) {
      if (events.length === 0) continue;

      const sessionInfo = sessionStatuses.get(sessionId);
      const payload: IngestPayload = {
        sessionId,
        agentFramework: "openclaw",
        events: [...events],
        sessionStatus: sessionInfo?.status as IngestPayload["sessionStatus"],
        sessionSummary: sessionInfo?.summary,
      };

      // Clear the batch
      pendingEvents.set(sessionId, []);

      await shipper.ship(payload);

      // Clean up completed sessions
      if (sessionInfo?.status === "completed" || sessionInfo?.status === "failed") {
        pendingEvents.delete(sessionId);
        sessionStatuses.delete(sessionId);
      }
    }
  }, config.batchIntervalMs);

  // Graceful shutdown
  const shutdown = (): void => {
    console.log("\n  Shutting down...");
    clearInterval(batchInterval);
    listener.disconnect();

    // Flush remaining events to buffer
    for (const [sessionId, events] of pendingEvents.entries()) {
      if (events.length > 0) {
        buffer.write({
          sessionId,
          agentFramework: "openclaw",
          events,
        });
      }
    }

    console.log("  ✓ Goodbye");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Connect to Gateway
  listener.connect();

  console.log("  Listening for agent activity... (Ctrl+C to stop)");
  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
