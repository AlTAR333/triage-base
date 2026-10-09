import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;

const SYSTEM_INSTRUCTION =
  "You are a helpful support assistant. Reply to the ticket submitted by a user in a clear and concise way.";

const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (
    (role === "user" || role === "assistant") &&
    typeof content === "string" &&
    content.trim().length > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Expected body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
  // The client resends the whole history on every request.
  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    !body.messages.every(isChatMessage)
  ) {
    return Response.json(
      {
        error:
          "Please provide a non-empty messages array of { role: 'user' | 'assistant', content: string }.",
      },
      { status: 400 },
    );
  }

  const messages = body.messages as ChatMessage[];

  // The conversation must end with a user message, which is what we answer.
  if (messages[messages.length - 1].role !== "user") {
    return Response.json(
      { error: "The last message must come from the user." },
      { status: 400 },
    );
  }

  if (!client || !MODEL) {
    return Response.json(
      {
        error:
          "LLM is not configured. Set LLM_API_KEY and LLM_MODEL in your .env file.",
      },
      { status: 500 },
    );
  }

  // Gemini calls the assistant role "model".
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const answer = response.text?.trim();

    if (!answer) {
      return Response.json(
        { error: "The LLM returned an empty answer." },
        { status: 502 },
      );
    }

    return Response.json({ answer });
  } catch (error) {
    console.error("LLM request failed:", error);
    return Response.json({ error: "The LLM request failed." }, { status: 502 });
  }
}