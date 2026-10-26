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
    <div className="space-y-8">
      <PageHeader
        eyebrow="RAG Knowledge Corpus"
        title="Knowledge &"
        pillHighlight="Documents"
        description="Upload resumes, job descriptions, or technical notes so Nexa AI can retrieve exact evidence for recommendations."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Card */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Ingestion</span>
            <h3 className="font-display text-xl font-bold text-[#17191B]">Upload Source Document</h3>
            <p className="text-xs text-[#666C72]">Supports PDF and DOCX files up to 10MB.</p>
          </div>

          <form onSubmit={onUpload} className="mt-5 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="w-full text-xs text-[#666C72] file:mr-3 file:rounded-full file:border-0 file:bg-[#E5EEF5] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#1b3b5a] hover:file:bg-[#B7D3E7]/70 cursor-pointer"
            />
            <Button type="submit" size="sm" disabled={uploading}>
              {uploading ? "Parsing & Indexing…" : "Upload to Corpus →"}
            </Button>
          </form>
        </Card>

        {/* Semantic Search Card */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Retrieval</span>
            <h3 className="font-display text-xl font-bold text-[#17191B]">Semantic Search</h3>
            <p className="text-xs text-[#666C72]">Query extracted passages and chunked knowledge.</p>
          </div>

          <form onSubmit={onSearch} className="mt-5 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. system design experience…"
              className="flex-1"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>
        </Card>
      </div>

      {error && <ErrorNote message={error} />}

      {results && (
        <div className="space-y-3">
          <h3 className="font-display text-xl font-bold text-[#17191B]">
            Search Results ({results.length})
          </h3>
          <div className="space-y-2.5">
            {results.map((r, idx) => (
              <div key={idx} className="prospera-card p-5 text-xs leading-relaxed text-[#17191B]">
                {String((r as Record<string, unknown>).text ?? JSON.stringify(r))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!docs && !error && <Loader label="Loading corpus documents" />}
      
      {docs && docs.length === 0 && (
        <EmptyState
          title="No Documents Uploaded Yet"
          body="Add a resume or curriculum overview to ground your AI career coach in your authentic history."
        />
      )}

      {docs && docs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-bold text-[#17191B]">
            Ingested <span className="pill-word">Files</span>
          </h3>
          <div className="space-y-2.5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="prospera-card flex items-center justify-between p-4 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E5EEF5] text-sm font-bold text-[#1b3b5a]">
                    📄
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#17191B]">
                      {d.title ?? d.filename ?? d.id}
                    </p>
                    {Boolean(d.created_at) && (
                      <p className="text-[11px] text-[#666C72]">
                        Uploaded {new Date(String(d.created_at)).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(d.id)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-[#666C72] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  Delete ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
