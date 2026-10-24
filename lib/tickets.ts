import { promises as fs } from "fs";
import path from "path";
import { HttpError } from "./http";
import type { SmokeRequest } from "./schemas";

export type Ticket = {
  ticket_id: string;
  subject: string;
  body: string;
  category?: string;
  priority?: string;
};

const FILES: Record<SmokeRequest["dataset"], string> = {
  "100": "support_tickets_100_labelled.json",
  "500": "support_tickets_500.json",
};

export async function loadTickets(
  dataset: SmokeRequest["dataset"],
): Promise<Ticket[]> {
  const file = path.join(process.cwd(), "data", FILES[dataset]);
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Ticket[];
  } catch {
    throw new HttpError(500, `Could not read dataset file ${FILES[dataset]}.`);
  }
}

/** Random sample without replacement (partial Fisher-Yates). */
export function sample<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
