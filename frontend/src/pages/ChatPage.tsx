import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendChat } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import { Button, ErrorNote, Input, PageHeader } from "../components/ui";

interface Line { role: "user" | "assistant"; content: string; sources?: string[] }

export function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [lines, setLines] = useState<Line[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setBusy(true);
    const outgoing = message;
    setMessage("");
    setLines((prev) => [...prev, { role: "user", content: outgoing }]);
    try {
      const res = await sendChat(outgoing, conversationId);
      setConversationId(res.conversation_id);
      setLines((prev) => [...prev, { role: "assistant", content: res.message, sources: res.sources }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      <PageHeader eyebrow="Memory" title="Coach chat" description="General conversation with context from your profile, memories, and active goal." />

      <div className="flex-1 space-y-4 overflow-y-auto rounded-md border border-rule bg-paper-dim/40 p-5">
        {lines.length === 0 && (
          <p className="text-sm text-ink-soft">Ask anything about your roadmap, a skill gap, or how to prioritize today.</p>
        )}
        {lines.map((line, idx) => (
          <div key={idx} className={line.role === "user" ? "text-right" : ""}>
            <span className={`inline-block max-w-[80%] rounded-md px-3.5 py-2.5 text-left text-sm ${line.role === "user" ? "bg-ink text-paper" : "bg-surface text-ink"}`}>
              {line.content}
            </span>
            {line.sources && line.sources.length > 0 && (
              <p className="mt-1 text-xs text-ink-soft">Sources: {line.sources.join(", ")}</p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="mt-3"><ErrorNote message={error} /></div>}

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message your coach…" disabled={busy} />
        <Button type="submit" disabled={busy || !message.trim()}>Send</Button>
      </form>
    </div>
  );
}
