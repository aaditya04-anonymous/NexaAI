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
    <div>
      <PageHeader eyebrow="Memory" title="Memories" description="Facts Nexa remembers about you — preferences, strengths, weaknesses, decisions." />

      <Card className="mb-8">
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <ErrorNote message={error} />}
          <Field label="Add a memory">
            <Textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="e.g. I learn best from hands-on projects, not video lectures." />
          </Field>
          <div className="flex items-center gap-3">
            <Input className="w-48" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category" />
            <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save memory"}</Button>
          </div>
        </form>
      </Card>

      {!memories && !error && <Loader label="Loading memories" />}
      {memories && memories.length === 0 && <EmptyState title="Nothing remembered yet" body="Add a memory above, or memories will be extracted automatically as you chat." />}
      {memories && memories.length > 0 && (
        <ul className="space-y-3">
          {memories.map((m) => (
            <li key={m.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink">{m.content ?? m.value}</p>
                    <div className="mt-1.5 flex gap-2">
                      {(m.category ?? m.type) && <Badge>{m.category ?? m.type}</Badge>}
                      {m.importance && <Badge tone="brass">{m.importance}</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(m.id)}>Remove</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
