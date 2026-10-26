import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addNewsToRoadmap, generateNews, getTodaysNews } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { NewsArticle } from "../lib/types";
import { Badge, Button, CircleArrow, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

export function NewsPage() {
  const navigate = useNavigate();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  function load() {
    getTodaysNews()
      .then(setArticle)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load career news."));
  }

  useEffect(load, []);

  async function onRefresh() {
    setBusy(true);
    setError(null);
    setSuccessNote(null);
    try {
      const fresh = await generateNews();
      setArticle(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't refresh career news.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddToRoadmap(itemTitle: string, idx: number) {
    if (!article || !article.id) return;
    setAddingIdx(idx);
    setError(null);
    try {
      const res = await addNewsToRoadmap(article.id, itemTitle, idx);
      setSuccessNote(res.message || `Added "${itemTitle}" to your active career roadmap!`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add this topic to your roadmap. Finalize a goal first.");
    } finally {
      setAddingIdx(null);
    }
  }

  function onAskCoach(itemTitle: string) {
    navigate("/chat", {
      state: {
        prefill: `How should I approach learning and adapting to this market trend: "${itemTitle}"? What skills or projects should I focus on?`,
      },
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Market Intelligence"
        title="Industry & Career"
        pillHighlight="Trends"
        description="Verified research analyzing current tech hiring signals, emerging frameworks, and in-demand capabilities."
        action={
          <Button onClick={onRefresh} disabled={busy}>
            {busy ? "Researching Markets…" : "Fetch Latest Intelligence ↗"}
          </Button>
        }
      />

      {successNote && (
        <div className="flex items-center justify-between rounded-2xl bg-[#C9EBC4]/40 border border-[#A9DE9C] p-4 text-xs font-semibold text-[#1c4722]">
          <span>✓ {successNote}</span>
          <Link to="/goals" className="underline font-bold hover:text-black">
            View Roadmap →
          </Link>
        </div>
      )}
      {error && <ErrorNote message={error} />}
      {!article && !error && <Loader label="Compiling market signals" />}

      {article && article.status !== "verified" && (
        <EmptyState
          title="No Verified Intelligence Stream Available"
          body={article.reason ?? "Live research requires an active search configuration; historical benchmarks remain active."}
        />
      )}

      {article && article.status === "verified" && (
        <div className="space-y-6">
          {article.query && (
            <div className="flex items-center gap-2 text-xs text-[#666C72]">
              <span className="font-semibold uppercase tracking-wider text-[#1b3b5a]">Query Target:</span>
              <span className="rounded-full bg-[#E5EEF5] px-3 py-1 font-mono text-[#17191B]">
                "{article.query}"
              </span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {article.items.map((item, idx) => (
              <div key={idx} className="prospera-card flex flex-col justify-between p-7">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#666C72]">
                      Signal 0{idx + 1}
                    </span>
                    <Badge tone="mint">Verified</Badge>
                  </div>

                  <h3 className="font-display text-xl font-bold leading-snug text-[#17191B]">
                    {item.title}
                  </h3>

                  {(item.summary || item.what_happened) && (
                    <p className="text-xs leading-relaxed text-[#666C72]">
                      {item.summary ?? item.what_happened}
                    </p>
                  )}

                  {item.why_it_matters && (
                    <div className="rounded-2xl bg-[#E5EEF5]/50 p-3.5 border border-[#B7D3E7]/40 text-xs text-[#1b3b5a]">
                      <span className="font-bold">Why it matters:</span> {item.why_it_matters}
                    </div>
                  )}

                  {item.recommended_action && (
                    <div className="rounded-2xl bg-[#C9EBC4]/30 p-3.5 border border-[#A9DE9C]/40 text-xs text-[#1c4722]">
                      <span className="font-bold">Suggested action:</span> {item.recommended_action}
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-6 pt-4 border-t border-[#E4E7E8]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onAddToRoadmap(item.title, idx)}
                      disabled={addingIdx === idx}
                    >
                      {addingIdx === idx ? "Adding to Roadmap…" : "+ Add to Roadmap"}
                    </Button>
                    <Button
                      size="sm"
                      variant="pill-light"
                      onClick={() => onAskCoach(item.title)}
                    >
                      Ask Coach ↗
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17191B] hover:underline"
                    >
                      Examine Primary Source <CircleArrow direction="up-right" className="!h-6 !w-6" />
                    </a>
                    {item.source_date && (
                      <span className="text-[11px] text-[#666C72]">{item.source_date}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
