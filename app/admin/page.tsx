"use client";

import { useEffect, useState } from "react";

type Run = {
  id: string;
  timestamp: string;
  dataset: string;
  labelled: boolean;
  strategy: string;
  model: string;
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

export default function AdminPage() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => setRuns(d.runs))
      .catch(() => setError("Could not load runs."));
  }, []);

  return (
    <main className="page wide">
      <h1>Admin: smoke test runs</h1>
      {error && <p role="alert">{error}</p>}
      {!runs && !error && <p>Loading...</p>}
      {runs && runs.length === 0 && <p>No runs logged yet.</p>}
      {runs && runs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Strategy</th>
              <th>Dataset</th>
              <th>OK / failed</th>
              <th>Escalated</th>
              <th>Category acc.</th>
              <th>Priority acc.</th>
              <th>Mismatches (cat/prio)</th>
              <th>Avg latency</th>
              <th>Cost</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.timestamp).toLocaleString()}</td>
                <td>{r.model}</td>
                <td>{r.strategy}</td>
                <td>{r.dataset}</td>
                <td>
                  {r.ok} / {r.failed}
                </td>
                <td>{r.escalated}</td>
                <td>{pct(r.category_accuracy)}</td>
                <td>{pct(r.priority_accuracy)}</td>
                <td>
                  {r.labelled
                    ? `${r.category_mismatches} / ${r.priority_mismatches}`
                    : "n/a"}
                </td>
                <td>{r.avg_latency_ms.toFixed(0)} ms</td>
                <td>${r.total_cost_usd.toFixed(6)}</td>
                <td>{r.total_tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
