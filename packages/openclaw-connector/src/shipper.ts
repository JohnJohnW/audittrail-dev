/**
 * Event Shipper
 *
 * Ships batched events to AuditTrail.dev via HTTPS POST.
 * Includes retry logic with exponential backoff and
 * falls back to the offline buffer on failure.
 */

import type { IngestPayload } from "./types";
import { OfflineBuffer } from "./buffer";

export class Shipper {
  private apiUrl: string;
  private apiKey: string;
  private maxRetries: number;
  private buffer: OfflineBuffer;
  private verbose: boolean;

  constructor(
    apiUrl: string,
    apiKey: string,
    maxRetries: number,
    buffer: OfflineBuffer,
    verbose: boolean
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.maxRetries = maxRetries;
    this.buffer = buffer;
    this.verbose = verbose;
  }

  /**
   * Ship a payload to AuditTrail.dev.
   * Retries with exponential backoff on failure.
   * Falls back to offline buffer if all retries fail.
   */
  async ship(payload: IngestPayload): Promise<boolean> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}/api/ingest/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          if (this.verbose) {
            const data = await response.json();
            console.log(
              `  ✓ Shipped ${payload.events.length} events (session risk: ${data.sessionRisk})`
            );
          }
          return true;
        }

        // Non-retryable client errors
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            `  ✗ API error ${response.status}: ${(errorData as Record<string, string>).error || response.statusText}`
          );
          return false;
        }

        // Server errors are retryable
        if (this.verbose) {
          console.log(`  ↻ Retry ${attempt + 1}/${this.maxRetries} (HTTP ${response.status})`);
        }
      } catch (error) {
        if (this.verbose) {
          console.log(
            `  ↻ Retry ${attempt + 1}/${this.maxRetries} (${error instanceof Error ? error.message : "network error"})`
          );
        }
      }

      // Exponential backoff
      if (attempt < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed — buffer offline
    console.log(`  ⏸ Buffering ${payload.events.length} events for later delivery`);
    this.buffer.write(payload);
    return false;
  }

  /**
   * Flush any offline-buffered events.
   */
  async flushBuffer(): Promise<number> {
    const payloads = this.buffer.flush();
    if (payloads.length === 0) return 0;

    let shipped = 0;
    for (const payload of payloads) {
      const success = await this.ship(payload);
      if (success) shipped++;
    }

    return shipped;
  }
}
