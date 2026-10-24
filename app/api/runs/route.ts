import { errorResponse } from "../../../lib/http";
import { readRuns } from "../../../lib/runs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = await readRuns();
    return Response.json({ runs: runs.reverse() }); // newest first
  } catch (error) {
    return errorResponse(error);
  }
}
