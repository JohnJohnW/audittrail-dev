/**
 * Offline Buffer
 *
 * Buffers events to a local JSONL file when AuditTrail.dev
 * is unreachable. Flushes buffered events on reconnect.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { IngestPayload } from "./types";

const DEFAULT_BUFFER_DIR = path.join(os.homedir(), ".audittrail");
const BUFFER_FILENAME = "buffer.jsonl";

export class OfflineBuffer {
  private bufferPath: string;

  constructor(customPath?: string) {
    const dir = customPath || DEFAULT_BUFFER_DIR;

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.bufferPath = path.join(dir, BUFFER_FILENAME);
  }

  /**
   * Append a payload to the buffer file.
   */
  write(payload: IngestPayload): void {
    const line = JSON.stringify(payload) + "\n";
    fs.appendFileSync(this.bufferPath, line, "utf-8");
  }

  /**
   * Read all buffered payloads and clear the buffer.
   * Returns an array of payloads.
   */
  flush(): IngestPayload[] {
    if (!fs.existsSync(this.bufferPath)) {
      return [];
    }

    const content = fs.readFileSync(this.bufferPath, "utf-8").trim();
    if (!content) return [];

    const payloads: IngestPayload[] = [];
    for (const line of content.split("\n")) {
      try {
        payloads.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    // Clear the buffer
    fs.writeFileSync(this.bufferPath, "", "utf-8");

    return payloads;
  }

  /**
   * Check if there are buffered events.
   */
  hasBuffered(): boolean {
    if (!fs.existsSync(this.bufferPath)) return false;
    const stat = fs.statSync(this.bufferPath);
    return stat.size > 0;
  }

  /**
   * Get the number of buffered payloads.
   */
  count(): number {
    if (!fs.existsSync(this.bufferPath)) return 0;
    const content = fs.readFileSync(this.bufferPath, "utf-8").trim();
    if (!content) return 0;
    return content.split("\n").length;
  }
}
