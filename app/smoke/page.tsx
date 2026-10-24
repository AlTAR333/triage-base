"use client";

import { useState, type FormEvent } from "react";

type Outcome = {
  ticket_id: string;
  subject: string;
  ok: boolean;
  error?: string;
  predicted?: { category: string; priority: string };
  expected?: { category: string; priority: string };
  category_match?: boolean;
  priority_match?: boolean;
  result?: {
    source: string;
    escalated: boolean;
    latency_ms: number;
    cost_usd: number;
    usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  };
};

type Run = {
  model: string;
  strategy: string;
  dataset: string;
  labelled: boolean;
  requested: number;
  ok: number;
  failed: number;
  escalated: number;
  category_mismatches: number | null;
  priority_mismatches: number | null;
  category_accuracy: number | null;
  priority_accuracy: number | null;
  avg_latency_ms: number;
  total_cost_usd: number;
  total_tokens: number;
};

const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);

export default function SmokePage() {
  const [dataset, setDataset] = useState("100");
  const [count, setCount] = useState(10);
  const [strategy, setStrategy] = useState("llm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setIssues([]);
    setRun(null);
    setOutcomes([]);
    try {
      const response = await fetch("/api/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, count, strategy }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Smoke test failed.");
        setIssues(Array.isArray(data?.issues) ? data.issues : []);
        return;
      }
      setRun(data.run);
      setOutcomes(data.outcomes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  const labelled = dataset === "100";

  return (
    <main className="page wide">
      <h1>Smoke test</h1>
      <form onSubmit={start} className="row" aria-busy={loading}>
        <label>
          Dataset
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            disabled={loading}
          >
            <option value="100">Labelled 100 tickets</option>
            <option value="500">500 tickets (unlabelled)</option>
          </select>
        </label>
        <label>
          Random sample size
          <input
            type="number"
            min={1}
            max={dataset === "100" ? 100 : 500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={loading}
          />
        </label>
        <label>
          Strategy
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            disabled={loading}
          >
            <option value="llm">llm</option>
            <option value="dm">dm</option>
            <option value="dm+llm">dm+llm</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Running..." : "Run smoke test"}
        </button>
      </form>

      {error && (
        <div role="alert" className="error-box">
          <strong>{error}</strong>
          {issues.length > 0 && (
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {run && (
        <section className="card" aria-label="Summary">
          <h2>Summary</h2>
          <p>
            Model: <strong>{run.model}</strong> · strategy {run.strategy} ·{" "}
            {run.ok}/{run.requested} succeeded
            {run.failed > 0 ? `, ${run.failed} failed` : ""}
            {run.strategy === "dm+llm" ? `, ${run.escalated} escalated to LLM` : ""}
          </p>
          {run.labelled && (
            <p>
              Mismatches: category <strong>{run.category_mismatches}</strong> (
              accuracy {pct(run.category_accuracy)}) · priority{" "}
              <strong>{run.priority_mismatches}</strong> (accuracy{" "}
              {pct(run.priority_accuracy)})
            </p>
          )}
          <p>
            Avg latency {run.avg_latency_ms.toFixed(0)} ms · cost $
            {run.total_cost_usd.toFixed(6)} · {run.total_tokens} tokens
          </p>
        </section>
      )}

      {outcomes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Predicted category</th>
              {labelled && <th>Labelled category</th>}
              <th>Predicted priority</th>
              {labelled && <th>Labelled priority</th>}
              <th>Source</th>
              <th>Tokens (in/out/total)</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => (
              <tr key={o.ticket_id}>
                <td>{o.ticket_id}</td>
                <td>{o.subject}</td>
                {o.ok ? (
                  <>
                    <td className={o.expected && !o.category_match ? "bad" : ""}>
                      {o.predicted?.category}
                    </td>
                    {labelled && <td>{o.expected?.category}</td>}
                    <td className={o.expected && !o.priority_match ? "bad" : ""}>
                      {o.predicted?.priority}
                    </td>
                    {labelled && <td>{o.expected?.priority}</td>}
                    <td>{o.result?.source}</td>
                    <td>
                      {o.result?.usage.input_tokens}/{o.result?.usage.output_tokens}/
                      {o.result?.usage.total_tokens}
                    </td>
                  </>
                ) : (
                  <td colSpan={labelled ? 6 : 4} className="bad">
                    Error: {o.error}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
