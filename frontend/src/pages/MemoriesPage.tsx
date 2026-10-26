import { useEffect, useState, type FormEvent } from "react";
import { deleteMemory, extractMemories, listMemories } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Memory } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Loader, PageHeader, Textarea } from "../components/ui";

export function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("preference");
  const [busy, setBusy] = useState(false);

  function load() {
    listMemories()
      .then(setMemories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load memories."));
  }

  useEffect(load, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await extractMemories(content, category);
      setMemories((prev) => [...created, ...(prev ?? [])]);
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save — memory may be disabled in your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteMemory(id);
      setMemories((prev) => (prev ?? []).filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that memory.");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Context Retention"
        title="Extracted"
        pillHighlight="Memories"
        description="Persistent facts, working constraints, learning styles, and technical preferences remembered by Nexa AI."
      />

      <Card className="bg-gradient-to-br from-white to-[#F8F9F8]">
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Manual Entry</span>
          <h2 className="font-display text-xl font-bold text-[#17191B]">Teach Nexa Something New</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorNote message={error} />}
          <Field label="Memory Content">
            <Textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. I prefer code snippets in TypeScript rather than JavaScript, and learn fastest by debugging broken repos."
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category (e.g. preference)"
              />
            </div>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Storing…" : "Store Memory →"}
            </Button>
          </div>
        </form>
      </Card>

      {!memories && !error && <Loader label="Loading memories" />}
      
      {memories && memories.length === 0 && (
        <EmptyState
          title="No Memories Recorded Yet"
          body="Store your technical preferences above, or they will be extracted automatically during conversations with your AI coach."
        />
      )}

      {memories && memories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {memories.map((m) => (
            <div key={m.id} className="prospera-card flex flex-col justify-between p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="blue">
                    {m.category ?? m.type ?? "general"}
                  </Badge>
                  {m.importance && (
                    <Badge tone="mint">
                      {m.importance}
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-[#17191B]">
                  "{m.content ?? m.value}"
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#E4E7E8] pt-3">
                <span className="text-[11px] text-[#666C72]">
                  {m.source ? `Source: ${m.source}` : "Direct Input"}
                </span>
                <button
                  onClick={() => onDelete(m.id)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-[#666C72] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  Remove ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
