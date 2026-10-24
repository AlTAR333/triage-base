// Usage: node scripts/report-table.mjs
// Prints a Markdown table of every logged smoke test run (data/runs.json),
// ready to paste into LLM-DM-report.md.
import { readFileSync } from "node:fs";

const runs = JSON.parse(readFileSync(new URL("../data/runs.json", import.meta.url), "utf8"));
const pct = (v) => (v == null ? "n/a" : `${(v * 100).toFixed(1)}%`);

console.log(
  "| Strategy | Model | Dataset | n | OK/failed | Escalated | Cat. acc. | Prio. acc. | Avg latency | Cost | Tokens |",
);
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of runs) {
  console.log(
    `| ${r.strategy} | ${r.model} | ${r.dataset} | ${r.requested} | ${r.ok}/${r.failed} | ${r.escalated} | ${pct(r.category_accuracy)} | ${pct(r.priority_accuracy)} | ${r.avg_latency_ms.toFixed(0)} ms | $${r.total_cost_usd.toFixed(6)} | ${r.total_tokens} |`,
  );
}
