import { z } from "zod";

export const CATEGORIES = [
  "technical_bug",
  "feature_request",
  "account",
  "billing",
] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const STRATEGIES = ["llm", "dm", "dm+llm"] as const;
export const DATASETS = ["100", "500"] as const;

export type Strategy = (typeof STRATEGIES)[number];

/* ---------- Triage request (what the front end sends) ---------- */
export const TriageRequestSchema = z.object({
  subject: z
    .string("subject must be a string")
    .trim()
    .min(1, "subject is required")
    .max(200, "subject must be at most 200 characters"),
  body: z
    .string("body must be a string")
    .trim()
    .min(1, "body is required")
    .max(8000, "body must be at most 8000 characters"),
  strategy: z.enum(STRATEGIES).default("llm"),
});
export type TriageRequest = z.infer<typeof TriageRequestSchema>;

/* ---------- What the model itself must produce ---------- */
export const TriageResultSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  needs_human_review: z.boolean(),
  summary: z.string().trim().min(1).max(500),
});
export type TriageResult = z.infer<typeof TriageResultSchema>;

/* ---------- Token usage ---------- */
export const UsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});
export type Usage = z.infer<typeof UsageSchema>;

/* ---------- Triage response (what the front end receives) ---------- */
export const TriageResponseSchema = TriageResultSchema.extend({
  strategy: z.enum(STRATEGIES),
  source: z.enum(["llm", "dm"]), // which kind of model produced the final answer
  escalated: z.boolean(), // dm+llm: the DM was not confident, the LLM took over
  model: z.string(),
  confidence: z.number().min(0).max(1).nullable(), // DM confidence, if a DM ran
  latency_ms: z.number().nonnegative(),
  cost_usd: z.number().nonnegative(),
  usage: UsageSchema,
});
export type TriageResponse = z.infer<typeof TriageResponseSchema>;

/* ---------- Chat ---------- */
export const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1, "message content must not be empty"),
      }),
    )
    .min(1, "messages must contain at least one message")
    .max(100),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/* ---------- Smoke test ---------- */
export const SmokeRequestSchema = z.object({
  dataset: z.enum(DATASETS),
  count: z.number("count must be a number").int().min(1).max(500),
  strategy: z.enum(STRATEGIES).default("llm"),
});
export type SmokeRequest = z.infer<typeof SmokeRequestSchema>;

export const RunRecordSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  dataset: z.enum(DATASETS),
  labelled: z.boolean(),
  strategy: z.enum(STRATEGIES),
  model: z.string(),
  requested: z.number().int(),
  ok: z.number().int(),
  failed: z.number().int(),
  escalated: z.number().int(),
  category_correct: z.number().int().nullable(),
  priority_correct: z.number().int().nullable(),
  category_mismatches: z.number().int().nullable(),
  priority_mismatches: z.number().int().nullable(),
  category_accuracy: z.number().nullable(),
  priority_accuracy: z.number().nullable(),
  avg_latency_ms: z.number(),
  total_latency_ms: z.number(),
  total_cost_usd: z.number(),
  total_tokens: z.number().int(),
});
export type RunRecord = z.infer<typeof RunRecordSchema>;

/** Readable one-line messages from a Zod error. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/** JSON Schemas derived from the Zod schemas (single source of truth). */
export const triageRequestJsonSchema = z.toJSONSchema(TriageRequestSchema);
export const triageResultJsonSchema = z.toJSONSchema(TriageResultSchema);
export const triageResponseJsonSchema = z.toJSONSchema(TriageResponseSchema);
