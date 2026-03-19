/**
 * Admin: Seed Control Embeddings
 *
 * POST: reads all ComplianceControl rows from the database, embeds each via
 * Gemini Embedding 2, and upserts into the Supabase control_embeddings table.
 *
 * Protected by CRON_SECRET (same token used by the sync cron job).
 * Idempotent - safe to re-run; existing rows are upserted.
 *
 * Usage:
 *   curl -X POST https://your-domain/api/admin/seed-embeddings \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { embedText, storeControlEmbedding } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes for this endpoint (seeding 63 controls)
export const maxDuration = 300;

const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY_MS = 300;

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const expected = `Bearer ${cronSecret}`;
  const provided = authHeader ?? "";
  const isValid =
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  logger.info("Starting control embedding seed");

  const controls = await db.complianceControl.findMany({
    include: { framework: { select: { name: true } } },
  });

  logger.info(`Seeding embeddings for ${controls.length} controls`);

  let embedded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < controls.length; i += BATCH_SIZE) {
    const batch = controls.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (control) => {
        const content = [
          `Control: ${control.code} - ${control.title}`,
          control.description ? `Description: ${control.description}` : "",
          `Framework: ${control.framework.name}`,
          `Evidence type: ${control.evidenceType}`,
        ]
          .filter(Boolean)
          .join("\n");

        const embedding = await embedText(content);

        if (embedding.length === 0) {
          throw new Error(`Empty embedding for ${control.code}`);
        }

        await storeControlEmbedding(control.code, control.framework.name, content, embedding);
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        embedded++;
      } else {
        skipped++;
        const errMsg = `${batch[j].code}: ${result.reason}`;
        errors.push(errMsg);
        logger.warn("Failed to embed control", {
          controlCode: batch[j].code,
          error: result.reason,
        });
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < controls.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  logger.info(`Seeding complete: ${embedded} embedded, ${skipped} skipped`);

  return NextResponse.json({
    success: true,
    total: controls.length,
    embedded,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
