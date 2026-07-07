"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string };

export default function CoachChat({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Something got in the way of my last response. Try that again.",
        },
      ]);
    }
    setSending(false);
  }

  return (
    <div className="card stack-3">
      <div
        ref={logRef}
        className="chat-log"
        style={{ maxHeight: 500, overflowY: "auto" }}
      >
        {messages.length === 0 && (
          <div className="chat-msg assistant">
            <div className="chat-bubble">
              Hi. I've read your results. What's on your mind?
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble">{m.content}</div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant">
            <div className="chat-bubble faint">Thinking...</div>
          </div>
        )}
      </div>
      <div className="chat-input-row">
        <textarea
          className="textarea"
          placeholder="Ask anything about your results..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          disabled={sending}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={!input.trim() || sending}
        >
          Send
        </button>
      </div>
    </div>
  );
}
