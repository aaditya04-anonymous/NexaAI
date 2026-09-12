import { useEffect, useState } from "react";
import { getHistory, getProgress, getWeeklyReport } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { HistoryBundle, ProgressSummary, WeeklyReport } from "../lib/types";
import { Card, ErrorNote, Loader, PageHeader, ProgressBar } from "../components/ui";

const HISTORY_LABELS: Record<keyof HistoryBundle, string> = {
  goal_history: "Goals", roadmap_history: "Roadmap", task_history: "Tasks",
  learning_history: "Learning", assessment_history: "Assessments", recommendation_history: "Recommendations",
};

export function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [history, setHistory] = useState<HistoryBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProgress(), getWeeklyReport(), getHistory()])
      .then(([p, r, h]) => { setProgress(p); setReport(r); setHistory(h); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load progress."));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!progress || !history) return <Loader label="Tallying progress" />;

  type HistoryEvent = Record<string, unknown> & { __kind: keyof HistoryBundle };
  const allEvents: HistoryEvent[] = (Object.entries(history) as Array<[keyof HistoryBundle, Array<Record<string, unknown>>]>)
    .flatMap(([key, events]) => events.map((e): HistoryEvent => ({ ...e, __kind: key })))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 25);

  return (
    <div>
      <PageHeader eyebrow="Signal" title="Progress" description="Roadmap and task completion, plus a running log of everything Nexa has recorded." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <p className="text-sm text-ink-soft">Overall goal progress</p>
          <p className="mt-1 font-display text-3xl text-ink">{Math.round(progress.goal_progress)}%</p>
          <div className="mt-3"><ProgressBar value={progress.goal_progress} /></div>
        </Card>
        <Card>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-2xl text-ink">{progress.completed_tasks}</p>
              <p className="text-xs text-ink-soft">Tasks completed</p>
            </div>
            <div>
              <p className="font-display text-2xl text-ink">{progress.active_goals}</p>
              <p className="text-xs text-ink-soft">Active goals</p>
            </div>
            <div>
              <p className={`font-display text-2xl ${progress.overdue_tasks > 0 ? "text-rose" : "text-ink"}`}>{progress.overdue_tasks}</p>
              <p className="text-xs text-ink-soft">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {report && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg text-ink">This week</p>
          <Card>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {Object.entries(report).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-ink-soft">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-ink">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <p className="mb-3 font-display text-lg text-ink">Activity log</p>
        {allEvents.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing logged yet — complete a task or edit a roadmap to see it here.</p>
        ) : (
          <ul className="divide-y divide-rule rounded-md border border-rule">
            {allEvents.map((event, idx) => (
              <li key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink-soft">{HISTORY_LABELS[event.__kind]}</span>
                <span className="text-ink">{String(event.event ?? "update")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
