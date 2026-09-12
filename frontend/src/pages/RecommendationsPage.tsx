import { useEffect, useState } from "react";
import { generateRecommendation, listRecommendations } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Recommendation } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

const PRIORITY_TONE: Record<string, "brass" | "moss" | "ember" | "rose"> = {
  low: "brass", medium: "brass", high: "ember", critical: "rose",
};

export function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    listRecommendations()
      .then((res) => setItems([...res].reverse()))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load recommendations."));
  }

  useEffect(load, []);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    try {
      const created = await generateRecommendation();
      setItems((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a recommendation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Signal"
        title="Recommendations"
        description="Suggested next actions based on your goal, progress, and noted weaknesses."
        action={<Button onClick={onGenerate} disabled={busy}>{busy ? "Thinking…" : "Generate recommendation"}</Button>}
      />
      {error && <div className="mb-6"><ErrorNote message={error} /></div>}
      {!items && !error && <Loader label="Loading recommendations" />}
      {items && items.length === 0 && <EmptyState title="No recommendations yet" body="Generate one once you have a goal and some progress logged." />}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li key={rec.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <p className="font-display text-lg text-ink">{rec.title}</p>
                  {rec.priority && <Badge tone={PRIORITY_TONE[rec.priority] ?? "brass"}>{rec.priority}</Badge>}
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">{rec.description}</p>
                {rec.reason && <p className="mt-2 text-sm text-ink">Why: {rec.reason}</p>}
                {rec.action && <p className="mt-1 text-sm text-moss-deep">Do this: {rec.action}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
