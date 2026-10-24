import { HttpError, errorResponse, readJson } from "../../../lib/http";
import { callLlm } from "../../../lib/llm";
import { ChatRequestSchema, formatIssues } from "../../../lib/schemas";

const SYSTEM_PROMPT =
  "You are a helpful customer support assistant. Answer clearly and briefly.";

export async function POST(request: Request) {
  try {
    const parsed = ChatRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "Invalid chat request.", formatIssues(parsed.error));
    }

    // Memory: the client sends the whole conversation history every time.
    const call = await callLlm([
      { role: "system", content: SYSTEM_PROMPT },
      ...parsed.data.messages,
    ]);

    return Response.json({
      answer: call.text,
      model: call.model,
      usage: call.usage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
