import { useState } from "react";
import { answerQuery } from "@/lib/chatbot";
import type { Reading, Shipment } from "@/lib/types";

export function ChatPanel({ shipment, readings }: { shipment: Shipment; readings: Reading[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: `Hi there! I'm your compliance assistant for ${shipment.id}. Here are quick things to ask:\n\n❓ "Is this shipment safe?"\n📋 "Give me a summary"\n🔒 "Explain the hash chain?"\n\nOr just type your question!` },
  ]);

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    const a = answerQuery(q, shipment, readings);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "bot", text: a }]);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-primary text-primary-foreground fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full text-xl shadow-lg hover:scale-105 transition"
        aria-label="Open compliance assistant"
      >
        💬
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-[9999] flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-card shadow-2xl">
          <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-t-xl px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Compliance Assistant</div>
              <div className="text-xs opacity-70">Context: {shipment.id} · {readings.length} readings</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setMsgs([{ role: "bot", text: `Hi there! I'm your compliance assistant for ${shipment.id}. Here are quick things to ask:\n\n❓ "Is this shipment safe?"\n📋 "Give me a summary"\n🔒 "Explain the hash chain?"\n\nOr just type your question!` }])} 
                className="hover:bg-white/10 rounded px-2 py-1 text-xs"
              >
                Clear Chat
              </button>
              <button onClick={() => setOpen(false)} className="hover:bg-white/10 rounded p-1">✕</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-3 bg-card/50">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"}`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t p-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about this shipment…"
                className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={send} className="bg-primary text-primary-foreground rounded-md px-3 text-sm">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
