import { z } from "zod";
import { HttpError } from "./http";
import {
  CATEGORIES,
  PRIORITIES,
  type Usage,
} from "./schemas";

/**
 * Decision-model client.
 *
 * Request/response shape follows the "Decisions Decisions" slides
 * (POST <DM_BASE_URL><DM_PATH>, JSON body with `model`, `state`, `questions`).
 * Providers differ, so CHECK YOUR PROVIDER'S DOCS and adjust DM_PATH or
 * the two small mapping spots marked ADAPT below if needed.
 */

const CATEGORY_CRITERIA: Record<(typeof CATEGORIES)[number], string> = {
  technical_bug: "something is broken, errors, crashes, wrong or unexpected behaviour",
  feature_request: "the customer asks for a new feature or an improvement",
  account: "login, password, access, permissions, profile or account settings",
  billing: "invoices, payments, refunds, pricing, subscription charges",
};

const PRIORITY_CRITERIA: Record<(typeof PRIORITIES)[number], string> = {
  low: "minor inconvenience, cosmetic issue or general question, no urgency",
  medium: "meaningful problem with a workaround, or a normal business request",
  high: "blocking, outage, security or data issue, money at risk, or urgent deadline",
};

const ChoiceAnswerSchema = z.object({
  choice: z.string(),
  probabilities: z.record(z.string(), z.number()),
});

const DmResponseSchema = z.object({
  category: ChoiceAnswerSchema,
  priority: ChoiceAnswerSchema,
  usage: z.object({ input_tokens: z.number() }).partial().optional(),
});

export type DecisionResult = {
  category: (typeof CATEGORIES)[number];
  priority: (typeof PRIORITIES)[number];
  confidence: number; // min(prob of chosen category, prob of chosen priority)
  usage: Usage;
  latencyMs: number;
  costUsd: number;
  model: string;
};

export async function callDecisionModel(ticket: {
  subject: string;
  body: string;
}): Promise<DecisionResult> {
  const baseUrl = process.env.DM_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.DM_API_KEY;
  const model = process.env.DM_MODEL;
  const path = process.env.DM_PATH || "/v1/systemone";

  if (!baseUrl || !model) {
    throw new HttpError(
      500,
      "Decision model is not configured. Set DM_BASE_URL, DM_API_KEY and DM_MODEL in .env.local.",
    );
  }

  // ADAPT (1): request payload. The ticket text is untrusted `state`.
  const payload = {
    model,
    state: `Subject: ${ticket.subject}\n\n${ticket.body}`,
    questions: {
      category: {
        type: "choice",
        instructions: "Which category best fits this support ticket?",
        criteria: CATEGORY_CRITERIA,
      },
      priority: {
        type: "choice",
        instructions: "How urgent is this support ticket?",
        criteria: PRIORITY_CRITERIA,
      },
    },
  };

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new HttpError(
      502,
      `Could not reach the decision model: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  const latencyMs = Date.now() - started;

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new HttpError(502, `Decision model returned ${response.status}: ${detail}`);
  }

  // ADAPT (2): response mapping. Validate, never trust.
  const parsed = DmResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new HttpError(
      502,
      "Decision model response did not match the expected shape (check DM_PATH and the provider docs).",
    );
  }
  const data = parsed.data;

  const category = CATEGORIES.find((c) => c === data.category.choice);
  const priority = PRIORITIES.find((p) => p === data.priority.choice);
  if (!category || !priority) {
    throw new HttpError(502, "Decision model chose an option outside the allowed set.");
  }

  const confidence = Math.min(
    data.category.probabilities[category] ?? 0,
    data.priority.probabilities[priority] ?? 0,
  );

  const input = data.usage?.input_tokens ?? 0;
  const price = Number(process.env.DM_PRICE_INPUT_PER_M);
  const costUsd = (input * (Number.isFinite(price) ? price : 0)) / 1_000_000;

  return {
    category,
    priority,
    confidence: Math.max(0, Math.min(1, confidence)),
    usage: { input_tokens: input, output_tokens: 0, total_tokens: input },
    latencyMs,
    costUsd,
    model,
  };
}
