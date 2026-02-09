# @audittrail/openclaw-connector

Lightweight governance connector for [OpenClaw](https://docs.openclaw.ai/) autonomous agents. Ships agent telemetry to [AuditTrail.dev](https://audittrail-dev.vercel.app) for compliance auditing against ISO 27001, Essential Eight, and Australian Privacy Principles.

## Quick Start

```bash
# Install globally
npm install -g @audittrail/openclaw-connector

# Run with your API key (get one from Settings in AuditTrail.dev)
audittrail-connect --api-key atk_your_key_here
```

That's it. The connector attaches to your local OpenClaw Gateway and starts streaming agent activity to AuditTrail.dev.

## How It Works

1. Connects to the OpenClaw Gateway WebSocket (default `ws://127.0.0.1:18789`)
2. Subscribes to agent events using the Gateway protocol (`role: operator`, `scopes: [operator.read]`)
3. Captures tool invocations: shell commands, file writes, network requests, browser actions, etc.
4. Redacts secrets and credentials before transmission
5. Batches and ships events via HTTPS to AuditTrail.dev every 5 seconds
6. If AuditTrail.dev is unreachable, buffers events locally and retries on reconnect

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key, -k` | AuditTrail API key (required) | — |
| `--api-url` | AuditTrail API URL | `https://audittrail-dev.vercel.app` |
| `--gateway, -g` | OpenClaw Gateway WebSocket URL | `ws://127.0.0.1:18789` |
| `--gateway-token` | OpenClaw Gateway auth token | — |
| `--batch-interval` | Event batch interval in ms | `5000` |
| `--verbose, -v` | Enable verbose logging | `false` |

## What Data Is Captured

The connector captures high-level agent actions, not raw content:

| Category | Source Tools | Example |
|----------|-------------|---------|
| `shell_exec` | `exec`, `bash`, `process` | "Executed: npm install express" |
| `file_write` | `apply_patch`, `write`, `edit` | "Wrote file: src/app.ts" |
| `file_read` | `read` | "Read file: config.json" |
| `network_request` | `web_fetch`, `web_search` | "Fetched URL: https://api.example.com" |
| `browser_action` | `browser`, `canvas` | "Browser action: navigate" |
| `credential_access` | Detected from exec patterns | "Credential pattern detected" |
| `session_management` | `sessions_*` | "Session started" |
| `agent_routing` | `sessions_send`, `sessions_spawn` | "Spawned sub-agent" |
| `system_config` | `gateway`, `cron`, `nodes` | "Gateway restart" |

## Privacy & Redaction

All payloads are redacted before leaving your machine:

- **Environment variables**: Any key matching `*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*` is replaced with `[REDACTED]`
- **API keys**: Known patterns (OpenAI `sk-`, GitHub `ghp_`, AWS `AKIA`, etc.) are redacted
- **Bearer tokens**: Authorization headers are stripped
- **Private keys**: PEM key blocks are redacted
- **Inline secrets**: `password=xxx` patterns in command arguments are redacted

The connector never modifies your OpenClaw Gateway or agent behavior. It is read-only.

## Offline Buffering

If AuditTrail.dev is unreachable, events are buffered to `~/.audittrail/buffer.jsonl`. On the next successful connection, buffered events are flushed automatically.

## Compliance Mapping

Each captured event is automatically mapped to governance controls:

- **ISO/IEC 27001:2022** — Access control, logging, configuration management, secure coding
- **ASD Essential Eight** — Application control, admin privilege restriction, MFA, user hardening
- **Australian Privacy Principles (APPs)** — Cross-border disclosure, security, access to personal information

## Troubleshooting

**"Cannot connect to Gateway"**
- Ensure OpenClaw Gateway is running: `openclaw gateway --port 18789`
- Check the WebSocket URL: `--gateway ws://127.0.0.1:18789`

**"Invalid API key"**
- Create a key in AuditTrail.dev: Settings → API Keys → Create Key
- Keys start with `atk_`

**"Events buffering offline"**
- Check your internet connection
- Verify the API URL: `--api-url https://audittrail-dev.vercel.app`
- Buffered events flush automatically when connectivity resumes

**Gateway token required**
- If your Gateway uses `OPENCLAW_GATEWAY_TOKEN`, pass it: `--gateway-token your_token`

## Development

```bash
cd packages/openclaw-connector
npm install
npm run build
node dist/index.js --api-key atk_test --verbose
```

## License

MIT
