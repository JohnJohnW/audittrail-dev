/**
 * OpenClaw Gateway Listener
 *
 * Connects to the OpenClaw Gateway WebSocket and
 * subscribes to agent events (tool invocations, session lifecycle).
 */

import WebSocket from "ws";
import { mapEvent } from "./event-mapper";
import type { NormalizedEvent, ConnectorConfig } from "./types";

type EventHandler = (sessionId: string, event: NormalizedEvent) => void;
type SessionHandler = (sessionId: string, status: string, summary?: string) => void;

export class GatewayListener {
  private ws: WebSocket | null = null;
  private config: ConnectorConfig;
  private onEvent: EventHandler;
  private onSession: SessionHandler;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageId = 0;
  private connected = false;

  constructor(
    config: ConnectorConfig,
    onEvent: EventHandler,
    onSession: SessionHandler
  ) {
    this.config = config;
    this.onEvent = onEvent;
    this.onSession = onSession;
  }

  /**
   * Connect to the OpenClaw Gateway WebSocket.
   */
  connect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
    }

    if (this.config.verbose) {
      console.log(`  Connecting to OpenClaw Gateway at ${this.config.gatewayUrl}...`);
    }

    this.ws = new WebSocket(this.config.gatewayUrl);

    this.ws.on("open", () => {
      this.connected = true;
      if (this.config.verbose) {
        console.log("  ✓ Connected to OpenClaw Gateway");
      }
      this.sendConnect();
    });

    this.ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    });

    this.ws.on("close", () => {
      this.connected = false;
      if (this.config.verbose) {
        console.log("  ↻ Gateway connection closed, reconnecting in 5s...");
      }
      this.scheduleReconnect();
    });

    this.ws.on("error", (err: Error) => {
      if (this.config.verbose) {
        console.error(`  ✗ Gateway error: ${err.message}`);
      }
      this.connected = false;
    });
  }

  /**
   * Send the connect handshake to the Gateway.
   */
  private sendConnect(): void {
    const id = `msg-${++this.messageId}`;
    const connectMsg = {
      type: "req",
      id,
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "audittrail-connector",
          version: "0.1.0",
          platform: process.platform,
          mode: "operator",
        },
        role: "operator",
        scopes: ["operator.read"],
        caps: [],
        commands: [],
        permissions: {},
        auth: this.config.gatewayToken
          ? { token: this.config.gatewayToken }
          : {},
        locale: "en-US",
        userAgent: "audittrail-connector/0.1.0",
      },
    };

    this.ws?.send(JSON.stringify(connectMsg));
  }

  /**
   * Handle an incoming WebSocket message.
   */
  private handleMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;

    if (type === "res") {
      // Response to our requests
      if (this.config.verbose && msg.ok) {
        console.log("  ✓ Gateway handshake successful");
      }
      return;
    }

    if (type === "event") {
      const eventName = msg.event as string;
      const payload = msg.payload as Record<string, unknown> | undefined;

      if (!payload) return;

      // Agent events contain tool invocations
      if (eventName === "agent") {
        this.handleAgentEvent(payload);
      }
    }
  }

  /**
   * Handle an agent event from the Gateway.
   */
  private handleAgentEvent(payload: Record<string, unknown>): void {
    const runId = (payload.runId as string) || "unknown";
    const status = payload.status as string | undefined;

    // Session lifecycle events
    if (status === "accepted" || status === "running") {
      this.onSession(runId, "running");
      return;
    }

    if (status === "completed" || status === "error" || status === "timeout") {
      const sessionStatus = status === "error" ? "failed" : status;
      const summary = payload.summary as string | undefined;
      this.onSession(runId, sessionStatus, summary);
      return;
    }

    // Tool invocation events (streaming)
    const toolName = payload.tool as string;
    if (toolName) {
      const input = payload.input as Record<string, unknown> | undefined;
      const output = payload.output as Record<string, unknown> | undefined;
      const metadata: Record<string, unknown> = {};

      if (payload.agentId) metadata.agentId = payload.agentId;
      if (payload.workspace) metadata.workspace = payload.workspace;

      const normalizedEvent = mapEvent(toolName, input, output, metadata);
      if (normalizedEvent) {
        this.onEvent(runId, normalizedEvent);
      }
    }
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from the Gateway.
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
