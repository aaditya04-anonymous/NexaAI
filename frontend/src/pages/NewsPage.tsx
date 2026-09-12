import { useEffect, useState } from "react";
import { generateNews, getTodaysNews } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { NewsArticle } from "../lib/types";
import { Button, Card, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

export function NewsPage() {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    getTodaysNews()
      .then(setArticle)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load career news."));
  }

  useEffect(load, []);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    try {
      const fresh = await generateNews();
      setArticle(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refresh career news.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Signal"
        title="Career news"
        description="Verified research only — Nexa never invents articles. If no search provider is configured, you'll see the last verified batch."
        action={<Button onClick={onRefresh} disabled={busy}>{busy ? "Researching…" : "Refresh"}</Button>}
      />

      {error && <div className="mb-6"><ErrorNote message={error} /></div>}
      {!article && !error && <Loader label="Checking for career news" />}

      {article && article.status !== "verified" && (
        <EmptyState title="No verified news available" body={article.reason ?? "Career research isn't configured for this deployment yet."} />
      )}

      {article && article.status === "verified" && (
        <div>
          {article.query && <p className="mb-4 text-sm text-ink-soft">Researched: “{article.query}”</p>}
          <ul className="space-y-4">
            {article.items.map((item, idx) => (
              <li key={idx}>
                <Card>
                  <p className="font-display text-lg text-ink">{item.title}</p>
                  {(item.summary || item.what_happened) && (
                    <p className="mt-2 text-sm text-ink-soft">{item.summary ?? item.what_happened}</p>
                  )}
                  {item.why_it_matters && <p className="mt-2 text-sm text-ink">Why it matters: {item.why_it_matters}</p>}
                  {item.recommended_action && <p className="mt-1 text-sm text-moss-deep">Suggested action: {item.recommended_action}</p>}
                  <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-ember-deep hover:underline">
                    Read source →
                  </a>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
