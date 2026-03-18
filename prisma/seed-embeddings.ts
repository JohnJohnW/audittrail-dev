/**
 * Seed Control Embeddings
 *
 * Reads all compliance controls from the database and generates
 * embeddings for each control description via Gemini Embedding 2.
 * Stores the embeddings in the Supabase vector store (control_embeddings table).
 *
 * Run: npx tsx prisma/seed-embeddings.ts
 *
 * Requires: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20;
const RATE_LIMIT_DELAY_MS = 500;

async function main() {
  const prisma = new PrismaClient();

  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    throw new Error(
      "Required env vars: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Fetch all controls from the database
  const controls = await prisma.complianceControl.findMany({
    include: { framework: { select: { name: true } } },
  });

  process.stderr.write(`Found ${controls.length} controls to embed\n`);

  let embedded = 0;
  let skipped = 0;

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
          model: EMBEDDING_MODEL,
          contents: [{ parts: [{ text: content }] }],
          config: { outputDimensionality: EMBEDDING_DIMENSIONS },
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
        skipped++;
        process.stderr.write(`  Error: ${r.reason}\n`);
      }
    }

    process.stderr.write(
      `  Progress: ${Math.min(i + BATCH_SIZE, controls.length)}/${controls.length}\n`
    );

    // Rate limit between batches
    if (i + BATCH_SIZE < controls.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  process.stderr.write(`\nDone: ${embedded} embedded, ${skipped} skipped\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`Fatal error: ${e}\n`);
  process.exit(1);
});
