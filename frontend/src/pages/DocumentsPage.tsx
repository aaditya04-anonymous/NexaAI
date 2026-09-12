import { useEffect, useRef, useState, type FormEvent } from "react";
import { deleteDocument, listDocuments, searchDocuments, uploadDocument } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { DocumentItem } from "../lib/types";
import { Button, Card, EmptyState, ErrorNote, Input, Loader, PageHeader } from "../components/ui";

export function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Record<string, unknown>> | null>(null);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    listDocuments()
      .then(setDocs)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load documents."));
  }

  useEffect(load, []);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const created = await uploadDocument(file);
      setDocs((prev) => [created, ...(prev ?? [])]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchDocuments(query));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search didn't work.");
    } finally {
      setSearching(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteDocument(id);
      setDocs((prev) => (prev ?? []).filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that document.");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Memory" title="Documents" description="Upload notes or resources so Nexa can search them for context." />

      <Card className="mb-6">
        <form onSubmit={onUpload} className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" className="text-sm text-ink-soft" />
          <Button type="submit" size="sm" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button>
        </form>
      </Card>

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your documents…" />
        <Button type="submit" variant="secondary" disabled={searching}>{searching ? "Searching…" : "Search"}</Button>
      </form>

      {error && <div className="mb-6"><ErrorNote message={error} /></div>}

      {results && (
        <div className="mb-8">
          <p className="mb-2 text-sm text-ink-soft">{results.length} result{results.length === 1 ? "" : "s"}</p>
          <ul className="space-y-2">
            {results.map((r, idx) => (
              <li key={idx} className="rounded-md border border-rule px-4 py-2.5 text-sm text-ink-soft">
                {String((r as Record<string, unknown>).text ?? JSON.stringify(r))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!docs && !error && <Loader label="Loading documents" />}
      {docs && docs.length === 0 && <EmptyState title="No documents uploaded" body="Upload a file above to make it searchable." />}
      {docs && docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-rule px-4 py-3">
              <span className="text-sm text-ink">{d.title ?? d.filename ?? d.id}</span>
              <Button variant="ghost" size="sm" onClick={() => onDelete(d.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
