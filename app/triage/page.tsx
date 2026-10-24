"use client";

import { useState, type FormEvent } from "react";
import UsageLine from "../components/UsageLine";

type TriageResult = {
  category: string;
  priority: string;
  needs_human_review: boolean;
  summary: string;
  strategy: string;
  source: string;
  escalated: boolean;
  model: string;
  confidence: number | null;
  latency_ms: number;
  cost_usd: number;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
};

export default function TriagePage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [strategy, setStrategy] = useState("llm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [result, setResult] = useState<TriageResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setIssues([]);
    setResult(null);

    try {
      // No client-side pre-validation on purpose: the server validates with
      // Zod and the front end shows its error clearly.
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, strategy }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Triage failed.");
        setIssues(Array.isArray(data?.issues) ? data.issues : []);
        return;
      }
      setResult(data as TriageResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>Ticket triage</h1>
      <form onSubmit={submit} aria-busy={loading}>
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
        />
        <label htmlFor="body">Ticket body</label>
        <textarea
          id="body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={loading}
        />
        <label htmlFor="strategy">Strategy</label>
        <select
          id="strategy"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          disabled={loading}
        >
          <option value="llm">llm (language model)</option>
          <option value="dm">dm (decision model)</option>
          <option value="dm+llm">dm+llm (DM first, LLM if unsure)</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Triaging..." : "Triage ticket"}
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

      {result && (
        <section className="card" aria-label="Triage result">
          <h2>Result</h2>
          <dl>
            <dt>Category</dt>
            <dd>{result.category}</dd>
            <dt>Priority</dt>
            <dd>{result.priority}</dd>
            <dt>Needs human review</dt>
            <dd>{result.needs_human_review ? "yes" : "no"}</dd>
            <dt>Summary</dt>
            <dd>{result.summary}</dd>
            <dt>Strategy / source</dt>
            <dd>
              {result.strategy} / {result.source}
              {result.escalated ? " (escalated from DM)" : ""}
            </dd>
            <dt>Model</dt>
            <dd>{result.model}</dd>
            {result.confidence !== null && (
              <>
                <dt>DM confidence</dt>
                <dd>{(result.confidence * 100).toFixed(0)}%</dd>
              </>
            )}
            <dt>Latency / cost</dt>
            <dd>
              {result.latency_ms} ms / ${result.cost_usd.toFixed(6)}
            </dd>
          </dl>
          <UsageLine
            input={result.usage.input_tokens}
            output={result.usage.output_tokens}
            total={result.usage.total_tokens}
          />
        </section>
      )}
    </main>
  );
}
