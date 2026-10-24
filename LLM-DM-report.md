# LLM vs Decision Model report

> Fill every `TODO`. Run the three smoke tests first (see "How to get the numbers" at the bottom), then paste the table from `node scripts/report-table.mjs`.

## 1. Decision model research

A decision model takes a `state` and typed questions (`choice`, yes/no, `score`) and answers each with a probability instead of generating text. It reads the input once, so it is typically faster and cheaper than an LLM, and its output always has the right shape. It cannot write, summarise or explain.

Options found (information from the course slides, as of October 2026, plus my own checks):

| Provider | Model | Access | Endpoint | Verdict |
|---|---|---|---|---|
| vLLM Semantic Router | Decision 3.0 (`vllm-sr/d3`, `d3-flash`, `d3-mini`, `d3-nano`, `d3-lite`, `d3-edge`) | API key from decision.vllm-sr.ai | `POST /v1/systemone` | TODO: free tier / limits you saw |
| OpenRouter | Jev (`typesafe/jev-1.13`) | input tokens charged | `/api/v1/systemone`, `/api/alpha/decisions` | TODO |
| TypeSafe AI | Jev (System One) | early access; signups were paused on 22 Sept | `POST /v1/systemone` | TODO |
| OpenAI | Decisions API (GPT-6 Luna) | public beta since 6 Oct | `POST /v1/decisions` | TODO: paid? |
| Cloudflare | Clef, Clef-flash | open weights, Workers AI | not confirmed | TODO |
| Perplexity | pplx-decider-v1-27b | Decisions API, open weights | not confirmed | TODO |
| Liquid AI | d1 | hosted API only | not confirmed | TODO |
| AWS | Strands Decider | open source, self-hosted | n/a | self-hosting, out of scope |
| Anthropic | none | no decision endpoint announced | n/a | not usable |

**Selected:** TODO (name the provider and model you actually used).
**Why:** TODO (e.g. free usage, hosted so no GPU needed, same `/v1/systemone` contract as the course examples, small model with low latency).

## 2. Integration strategy

The user picks a strategy from the front end (Triage page and Smoke test page):

| Strategy | What happens |
|---|---|
| `llm` | The LLM alone returns category, priority, human-review flag and a summary (JSON validated with Zod, one retry if invalid). |
| `dm` | The decision model alone answers two `choice` questions: `category` (4 options) and `priority` (3 options), each with criteria describing the options. `needs_human_review` is set when confidence is below `DM_REVIEW_THRESHOLD` (0.7). No summary is produced. |
| `dm+llm` | The decision model goes first. If its confidence (the lower of the two chosen-option probabilities) is at least `DM_CONFIDENCE_THRESHOLD` (0.8), its answer is kept. Otherwise the ticket is escalated to the LLM. |

Why this design: category and priority are a closed set of options known in advance, volume can be high and we want to act on a probability, which are the "good fit" criteria from the slides. Summaries and explanations need an LLM, which is why `dm+llm` keeps the LLM as a fallback.

Safeguards: the ticket text is untrusted, so the decision-model response is validated with Zod and any option outside the allowed set is rejected. The final triage response is validated against the response schema before it is returned. Every smoke test run logs the strategy and model, and `/admin` shows them.

## 3. Results

Same labelled sample size for each strategy (TODO: n = ?, dataset = labelled 100).

TODO: paste the output of `node scripts/report-table.mjs` here.

## 4. Analysis

TODO, answer with your own numbers:

- Accuracy: which strategy is best for category? for priority? Is the gap large or within noise for a small sample?
- Latency: how much faster is the DM than the LLM? (Vendors claim ~100x cheaper and ~200x faster; the slides say treat that as vendor figures.)
- Cost: cost per 1,000 tickets for each strategy, extrapolated from your runs.
- `dm+llm`: what share of tickets was escalated? Did escalation improve accuracy over `dm` alone? What would changing the threshold do?
- Confidence calibration: when the DM said high confidence, was it right? (The slides cite one test with 87% confidence for 75% accuracy.)
- Limits: the DM cannot write a summary; close categories (for example `account` vs `technical_bug`) are where it may be confidently wrong; small sample.
- Recommendation: which strategy would you ship, and why?

## How to get the numbers

1. Fill `.env.local` (see `.env.example`).
2. `npm run dev`, open http://localhost:3033/smoke.
3. Dataset "Labelled 100", the same sample size (say 30) for `llm`, `dm`, `dm+llm`.
4. Open http://localhost:3033/admin to check the three runs, then run `node scripts/report-table.mjs`.
