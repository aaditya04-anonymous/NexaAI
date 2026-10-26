import { useEffect, useState } from "react";
import {
  acceptRecommendation, completeRecommendation, generateRecommendation,
  listRecommendations, rejectRecommendation,
} from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Recommendation } from "../lib/types";
import { Badge, Button, EmptyState, ErrorNote, Loader, PageHeader } from "../components/ui";

const PRIORITY_TONE: Record<string, "blue" | "mint" | "peach" | "rose"> = {
  low: "blue",
  medium: "mint",
  high: "peach",
  critical: "rose",
};

export function RecommendationsPage() {
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

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

  async function onAccept(id: string) {
    setActingId(id);
    try {
      await acceptRecommendation(id);
      load();
    } catch {
      // Refresh state
      load();
    } finally {
      setActingId(null);
    }
  }

  async function onComplete(id: string) {
    setActingId(id);
    try {
      await completeRecommendation(id);
      load();
    } catch {
      load();
    } finally {
      setActingId(null);
    }
  }

  async function onReject(id: string) {
    setActingId(id);
    try {
      await rejectRecommendation(id);
      load();
    } catch {
      load();
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Targeted Action"
        title="Strategic"
        pillHighlight="Recommendations"
        description="High-leverage recommendations tailored to your active goal, current learning retention, and market skill demands."
        action={
          <Button onClick={onGenerate} disabled={busy}>
            {busy ? "Formulating Advice…" : "+ Generate Recommendation"}
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}
      {!items && !error && <Loader label="Evaluating growth vectors" />}
      
      {items && items.length === 0 && (
        <EmptyState
          title="No Recommendations Synthesized Yet"
          body="Complete practice tasks and milestone assessments to provide enough performance data for personalized recommendations."
          action={
            <Button onClick={onGenerate} disabled={busy}>
              Generate Strategic Insight →
            </Button>
          }
        />
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((rec, idx) => (
            <div key={rec.id} className="prospera-card flex flex-col justify-between p-7">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#666C72]">
                    Rec 0{idx + 1}
                  </span>
                  {rec.priority && (
                    <Badge tone={PRIORITY_TONE[rec.priority] ?? "blue"}>
                      {rec.priority} priority
                    </Badge>
                  )}
                </div>

                <h3 className="font-display text-2xl font-bold text-[#17191B]">
                  {rec.title}
                </h3>
                <p className="text-xs leading-relaxed text-[#666C72]">
                  {rec.description}
                </p>

                {rec.reason && (
                  <div className="rounded-2xl bg-[#E5EEF5]/50 p-3.5 border border-[#B7D3E7]/40 text-xs text-[#1b3b5a]">
                    <span className="font-bold">Rationale:</span> {rec.reason}
                  </div>
                )}

                {rec.action && (
                  <div className="rounded-2xl bg-[#C9EBC4]/30 p-3.5 border border-[#A9DE9C]/40 text-xs text-[#1c4722]">
                    <span className="font-bold">Action plan:</span> {rec.action}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E7E8] pt-4">
                <span className="text-xs font-semibold text-[#666C72]">
                  {rec.kind || "Career Optimization"}{rec.status && ` • ${rec.status}`}
                </span>
                <div className="flex items-center gap-2">
                  {rec.status !== "completed" && rec.status !== "accepted" && (
                    <Button size="sm" variant="secondary" onClick={() => onAccept(rec.id)} disabled={actingId === rec.id}>
                      Accept
                    </Button>
                  )}
                  {rec.status !== "completed" && (
                    <Button size="sm" onClick={() => onComplete(rec.id)} disabled={actingId === rec.id}>
                      ✓ Done
                    </Button>
                  )}
                  {rec.status !== "rejected" && rec.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => onReject(rec.id)}
                      disabled={actingId === rec.id}
                      className="text-xs text-[#8A9096] hover:text-red-500 transition-colors cursor-pointer px-2 py-1"
                      title="Dismiss recommendation"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>

          ))}
        </div>
      )}
    </div>
  );
}
