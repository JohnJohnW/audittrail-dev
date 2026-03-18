/**
 * One-shot seed trigger for control embeddings.
 * Protected by a static bearer token — run once, then this route can be deleted.
 *
 * POST /api/admin/seed-embeddings
 * Authorization: Bearer 0726bf58e479b4208355330e4131a857180cb6d409f560e3
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro max

const SEED_TOKEN = "0726bf58e479b4208355330e4131a857180cb6d409f560e3";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${SEED_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error:
          "Missing env vars: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { createClient } = await import("@supabase/supabase-js");

    const ai = new GoogleGenAI({ apiKey });
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const controls = await db.complianceControl.findMany({
      include: { framework: { select: { name: true } } },
    });

    logger.info(`Seed embeddings: found ${controls.length} controls`);

    const BATCH_SIZE = 20;
    let embedded = 0;
    let failed = 0;
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

          const result = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: [{ parts: [{ text: content }] }],
            config: { outputDimensionality: 768 },
          });

          const embedding = result.embeddings?.[0]?.values;
          if (!embedding || embedding.length === 0) {
            throw new Error(`Empty embedding for ${control.code}`);
          }

          const id = `${control.framework.name}:${control.code}`;
          const { error } = await supabase.from("control_embeddings").upsert(
            {
              id,
              control_code: control.code,
              framework_name: control.framework.name,
              content,
              embedding: `[${embedding.join(",")}]`,
            },
            { onConflict: "id" }
          );

          if (error) throw error;
          return control.code;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          embedded++;
        } else {
          failed++;
          errors.push(String(r.reason));
        }
      }

      // Rate limit between batches
      if (i + BATCH_SIZE < controls.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logger.info(`Seed embeddings complete: ${embedded} embedded, ${failed} failed`);

    return NextResponse.json({
      success: true,
      total: controls.length,
      embedded,
      failed,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Seed embeddings failed", { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
