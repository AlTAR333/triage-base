# Support ticket triage app

A Next.js app that triages support tickets with an LLM, a decision model (DM), or both.

## Features

- **Chat** (`/`): LLM chat with memory (the full conversation history is sent on each message).
- **Triage** (`/triage`): category, priority, human-review flag and summary for one ticket. Choose the strategy `llm`, `dm` or `dm+llm`. Request and response follow JSON schemas and are validated with Zod; invalid requests show a clear error. Each result shows token usage (input, output, total).
- **Smoke test** (`/smoke`): pick the dataset (labelled 100 or 500), a random sample size and a strategy. For the labelled set it shows predicted vs labelled category and priority per ticket plus a mismatch summary.
- **Admin** (`/admin`): every logged run with accuracy, outcome counts, latency, cost and model. Runs are stored in `data/runs.json`.

## Setup

Requires Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3033.

### Environment variables

| Variable | Meaning |
|---|---|
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Any OpenAI-compatible provider. The base URL includes `/v1`. |
| `LLM_PRICE_INPUT_PER_M`, `LLM_PRICE_OUTPUT_PER_M` | USD per million tokens, used for the cost column (0 if free). |
| `DM_BASE_URL`, `DM_API_KEY`, `DM_MODEL`, `DM_PATH` | Decision model provider (default path `/v1/systemone`). Check your provider's docs. |
| `DM_PRICE_INPUT_PER_M` | USD per million input tokens for the DM. |
| `DM_CONFIDENCE_THRESHOLD` | `dm+llm` keeps the DM answer at or above this confidence (default 0.8). |
| `DM_REVIEW_THRESHOLD` | DM answers below this confidence set `needs_human_review` (default 0.7). |

## Code map

| Path | Role |
|---|---|
| `lib/schemas.ts` | Zod schemas (and JSON Schemas) for triage request/response, chat, smoke test, run log |
| `lib/llm.ts` | OpenAI-compatible chat completions client with token usage, latency and cost |
| `lib/decision.ts` | Decision model client |
| `lib/triage.ts` | The three strategies |
| `lib/tickets.ts`, `lib/runs.ts` | Dataset loading and sampling; run log |
| `app/api/*` | `chat`, `triage`, `smoke`, `runs` routes |

The datasets are in `data/`: 500 unlabelled tickets and 100 labelled tickets (category, priority, review flag).

## Report

See [`LLM-DM-report.md`](./LLM-DM-report.md). `node scripts/report-table.mjs` prints the run table.

## Checks

```sh
npm run typecheck
npm run build
```
