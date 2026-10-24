import { HttpError, errorResponse, readJson } from "../../../lib/http";
import {
  TriageRequestSchema,
  TriageResponseSchema,
  formatIssues,
} from "../../../lib/schemas";
import { runTriage } from "../../../lib/triage";

export async function POST(request: Request) {
  try {
    // 1. Validate the incoming payload against the request schema.
    const parsedRequest = TriageRequestSchema.safeParse(await readJson(request));
    if (!parsedRequest.success) {
      throw new HttpError(
        400,
        "Invalid triage request.",
        formatIssues(parsedRequest.error),
      );
    }

    // 2. Run triage, then validate the outgoing payload before returning it.
    const result = await runTriage(parsedRequest.data);
    const parsedResponse = TriageResponseSchema.safeParse(result);
    if (!parsedResponse.success) {
      throw new HttpError(
        502,
        "The triage result did not match the response schema.",
        formatIssues(parsedResponse.error),
      );
    }
    return Response.json(parsedResponse.data);
  } catch (error) {
    return errorResponse(error);
  }
}
