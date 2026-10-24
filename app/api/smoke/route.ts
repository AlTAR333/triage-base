import { randomUUID } from "crypto";
import { HttpError, errorResponse, readJson } from "../../../lib/http";
import { appendRun } from "../../../lib/runs";
import {
  SmokeRequestSchema,
  formatIssues,
  type RunRecord,
  type TriageResponse,
} from "../../../lib/schemas";
import { loadTickets, sample } from "../../../lib/tickets";
import { runTriage } from "../../../lib/triage";

export const maxDuration = 300;
const CONCURRENCY = 3;

type TicketOutcome = {
  ticket_id: string;
  subject: string;
  ok: boolean;
  error?: string;
  predicted?: { category: string; priority: string };
  expected?: { category: string; priority: string };
  category_match?: boolean;
  priority_match?: boolean;
  result?: TriageResponse;
};

export async function POST(request: Request) {
  try {
    const parsed = SmokeRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "Invalid smoke test request.", formatIssues(parsed.error));
    }
    const { dataset, count, strategy } = parsed.data;

    const labelled = dataset === "100";
    const tickets = sample(await loadTickets(dataset), count);

    // Simple worker pool so we do not hammer the provider.
    const outcomes: TicketOutcome[] = new Array(tickets.length);
    let next = 0;
    async function worker() {
      while (next < tickets.length) {
        const index = next++;
        const ticket = tickets[index];
        try {
          const result = await runTriage({
            subject: ticket.subject,
            body: ticket.body,
            strategy,
          });
          const outcome: TicketOutcome = {
            ticket_id: ticket.ticket_id,
            subject: ticket.subject,
            ok: true,
            predicted: { category: result.category, priority: result.priority },
            result,
          };
          if (labelled && ticket.category && ticket.priority) {
            outcome.expected = { category: ticket.category, priority: ticket.priority };
            outcome.category_match = result.category === ticket.category;
            outcome.priority_match = result.priority === ticket.priority;
          }
          outcomes[index] = outcome;
        } catch (error) {
          outcomes[index] = {
            ticket_id: ticket.ticket_id,
            subject: ticket.subject,
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const okOutcomes = outcomes.filter((o) => o.ok);
    const results = okOutcomes.map((o) => o.result as TriageResponse);
    const sum = (f: (r: TriageResponse) => number) =>
      results.reduce((acc, r) => acc + f(r), 0);

    const categoryCorrect = okOutcomes.filter((o) => o.category_match).length;
    const priorityCorrect = okOutcomes.filter((o) => o.priority_match).length;
    const totalLatency = sum((r) => r.latency_ms);

    const run: RunRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      dataset,
      labelled,
      strategy,
      model:
        strategy === "llm"
          ? (process.env.LLM_MODEL ?? "n/a")
          : strategy === "dm"
            ? (process.env.DM_MODEL ?? "n/a")
            : `${process.env.DM_MODEL ?? "n/a"} + ${process.env.LLM_MODEL ?? "n/a"}`,
      requested: tickets.length,
      ok: okOutcomes.length,
      failed: outcomes.length - okOutcomes.length,
      escalated: results.filter((r) => r.escalated).length,
      category_correct: labelled ? categoryCorrect : null,
      priority_correct: labelled ? priorityCorrect : null,
      category_mismatches: labelled ? okOutcomes.length - categoryCorrect : null,
      priority_mismatches: labelled ? okOutcomes.length - priorityCorrect : null,
      category_accuracy:
        labelled && okOutcomes.length ? categoryCorrect / okOutcomes.length : null,
      priority_accuracy:
        labelled && okOutcomes.length ? priorityCorrect / okOutcomes.length : null,
      avg_latency_ms: results.length ? totalLatency / results.length : 0,
      total_latency_ms: totalLatency,
      total_cost_usd: sum((r) => r.cost_usd),
      total_tokens: sum((r) => r.usage.total_tokens),
    };

    await appendRun(run);
    return Response.json({ run, outcomes });
  } catch (error) {
    return errorResponse(error);
  }
}
