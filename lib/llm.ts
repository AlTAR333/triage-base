import { HttpError } from "./http";
import type { Usage } from "./schemas";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCallResult = {
  text: string;
  usage: Usage;
  latencyMs: number;
  costUsd: number;
  model: string;
};

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calls any OpenAI-compatible /chat/completions endpoint.
 * LLM_BASE_URL must include the version prefix, e.g. https://openrouter.ai/api/v1
 */
export async function callLlm(messages: ChatMessage[]): Promise<LlmCallResult> {
  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!baseUrl || !model) {
    throw new HttpError(
      500,
      "LLM is not configured. Set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL in .env.local.",
    );
  }

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model, messages, temperature: 0 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new HttpError(
      502,
      `Could not reach the LLM provider: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  const latencyMs = Date.now() - started;

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new HttpError(502, `LLM provider returned ${response.status}: ${detail}`);
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  } | null;

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new HttpError(502, "LLM provider returned an unexpected response shape.");
  }

  const input = data?.usage?.prompt_tokens ?? 0;
  const output = data?.usage?.completion_tokens ?? 0;
  const total = data?.usage?.total_tokens ?? input + output;
  const costUsd =
    (input * num(process.env.LLM_PRICE_INPUT_PER_M) +
      output * num(process.env.LLM_PRICE_OUTPUT_PER_M)) /
    1_000_000;

  return {
    text,
    usage: { input_tokens: input, output_tokens: output, total_tokens: total },
    latencyMs,
    costUsd,
    model,
  };
}

/** Extracts a JSON object from model text (handles ```json fences and chatter). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON object found in model output.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
