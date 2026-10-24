"use client";

import { useState, type FormEvent } from "react";
import UsageLine from "./components/UsageLine";

type Message = {
  role: "user" | "assistant";
  text: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
};

export default function ChatPage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending || !text.trim()) return;

    const message = text;
    setIsSending(true);
    setError(null);

    // Memory: send the whole history plus the new user message.
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: message },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await response.json();

      if (!response.ok) {
        const issues: string[] = Array.isArray(data?.issues) ? data.issues : [];
        throw new Error(
          [data?.error ?? "Unable to send your message.", ...issues].join(" "),
        );
      }
      if (typeof data?.answer !== "string") {
        throw new Error("The server returned an invalid reply. Please try again.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "user", text: message },
        { role: "assistant", text: data.answer, usage: data.usage },
      ]);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send your message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="chat">
      <h1>Support chat</h1>
      <p>The assistant remembers the conversation.</p>
      <section
        className="messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 && <p>No messages yet.</p>}
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={index}>
            <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
            <p>{message.text}</p>
            {message.usage && (
              <UsageLine
                input={message.usage.input_tokens}
                output={message.usage.output_tokens}
                total={message.usage.total_tokens}
              />
            )}
          </div>
        ))}
      </section>
      <form onSubmit={sendMessage} aria-busy={isSending}>
        <label htmlFor="message">Your message</label>
        <textarea
          id="message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Describe what you need help with..."
          rows={3}
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !text.trim()}>
          {isSending ? "Sending..." : "Send"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
