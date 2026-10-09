import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;

const SYSTEM_INSTRUCTION =
  "You are a helpful support assistant. Reply to the ticket sumbitted by a user in a clear and concise way.";

const client = new GoogleGenAI({ apiKey });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    !body.message.trim()
  ) {
    return Response.json(
      { error: "Please provide a non-empty message string." },
      { status: 400 },
    );
  }

  // if no client
  if (!client) {
    return Response.json(
      { error: "LLM is not configured. Set LLM_API_KEY (or GOOGLE_API_KEY) in your .env file."}, { status: 500 });
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: body.message,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const answer = response.text?.trim();

    // if no answer
    if (!answer) {
      return Response.json(
        { error: "The LLM returned an empty answer." },
        { status: 502 },
      );
    }

    return Response.json({ answer });
  } catch (error) {
    console.error("LLM request failed:", error);
    return Response.json(
      { error: "The LLM request failed." },
      { status: 502 },
    );
  }
}