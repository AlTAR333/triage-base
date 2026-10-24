import { promises as fs } from "fs";
import path from "path";
import { RunRecordSchema, type RunRecord } from "./schemas";

const RUNS_FILE = path.join(process.cwd(), "data", "runs.json");

let queue: Promise<unknown> = Promise.resolve();

export async function readRuns(): Promise<RunRecord[]> {
  try {
    const raw = JSON.parse(await fs.readFile(RUNS_FILE, "utf8"));
    return Array.isArray(raw)
      ? raw.flatMap((r) => {
          const parsed = RunRecordSchema.safeParse(r);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}

/** Appends one run to data/runs.json (writes are serialized). */
export function appendRun(run: RunRecord): Promise<void> {
  const task = queue.then(async () => {
    const runs = await readRuns();
    runs.push(run);
    await fs.mkdir(path.dirname(RUNS_FILE), { recursive: true });
    await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf8");
  });
  queue = task.catch(() => undefined);
  return task;
}
