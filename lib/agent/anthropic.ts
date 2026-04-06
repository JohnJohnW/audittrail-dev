import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** Model IDs available for agent operations */
export const MODELS = {
  OPUS: "claude-opus-4-20250514",
  SONNET: "claude-sonnet-4-20250514",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/** Approximate cost per million tokens (USD cents) */
export const MODEL_COSTS = {
  [MODELS.OPUS]: { input: 1500, output: 7500 },
  [MODELS.SONNET]: { input: 300, output: 1500 },
} as const;

/** Calculate cost in cents from token counts */
export function calculateCostCents(
  model: ModelId,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model] ?? MODEL_COSTS[MODELS.OPUS];
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  return Math.ceil(inputCost + outputCost);
}
