import { useEffect, useState } from "react";
import { getHistory, getProgress, getWeeklyReport } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { HistoryBundle, ProgressSummary, WeeklyReport } from "../lib/types";
import { Badge, Card, ErrorNote, Loader, PageHeader, ProgressBar } from "../components/ui";

const HISTORY_LABELS: Record<keyof HistoryBundle, string> = {
  goal_history: "Goal",
  roadmap_history: "Roadmap",
  task_history: "Task",
  learning_history: "Learning",
  assessment_history: "Assessment",
  recommendation_history: "Advice",
};

export function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [history, setHistory] = useState<HistoryBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProgress(), getWeeklyReport(), getHistory()])
      .then(([p, r, h]) => {
        setProgress(p);
        setReport(r);
        setHistory(h);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load progress metrics."));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!progress || !history) return <Loader label="Aggregating performance evidence" />;

  type HistoryEvent = Record<string, unknown> & { __kind: keyof HistoryBundle };
  const allEvents: HistoryEvent[] = (
    Object.entries(history) as Array<[keyof HistoryBundle, Array<Record<string, unknown>>]>
  )
    .flatMap(([key, events]) => events.map((e): HistoryEvent => ({ ...e, __kind: key })))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 25);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evidence-Based Analytics"
        title="Performance &"
        pillHighlight="Progress Tracking"
        description="Transparent verification of milestone completions, task consistency, and documented reflections."
      />

      {/* Top Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Progress Bar Card (7 cols) */}
        <div className="md:col-span-7">
          <Card className="flex h-full flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Overall Vector</span>
              <h3 className="font-display mt-1 text-3xl font-extrabold text-[#17191B]">
                {Math.round(progress.goal_progress)}% Achieved
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#666C72]">
                Reflects completed roadmap milestones and verified daily tasks across your active goals.
              </p>
            </div>
            <div className="mt-6 space-y-2">
              <ProgressBar value={progress.goal_progress} />
              <div className="flex justify-between text-[11px] font-semibold text-[#666C72]">
                <span>Foundation (0%)</span>
                <span>Role Readiness (100%)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 3 Metric Pills (5 cols) */}
        <div className="md:col-span-5 grid grid-cols-2 gap-4">
          <Card className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666C72]">Tasks Done</span>
            <p className="font-display mt-2 text-4xl font-extrabold text-[#17191B]">
              {progress.completed_tasks}
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#C9EBC4] px-2 py-0.5 text-[10px] font-semibold text-[#1c4722]">
              Verified
            </span>
          </Card>

          <Card className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666C72]">Active Goals</span>
            <p className="font-display mt-2 text-4xl font-extrabold text-[#17191B]">
              {progress.active_goals}
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#E5EEF5] px-2 py-0.5 text-[10px] font-semibold text-[#1b3b5a]">
              In Flight
            </span>
          </Card>

          <Card className="col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#666C72]">Pending Reviews</span>
                <p className="font-display text-2xl font-bold text-[#17191B]">
                  {progress.overdue_tasks}
                </p>
              </div>
              <Badge tone={progress.overdue_tasks > 0 ? "peach" : "mint"}>
                {progress.overdue_tasks === 0 ? "Optimal Cadence" : "Attention Needed"}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Weekly Report Section */}
      {report && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#17191B]">
            Weekly <span className="pill-word-mint">Report</span>
          </h2>
          <Card>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {Object.entries(report).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[#666C72]">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="font-display text-lg font-bold text-[#17191B]">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {/* Historical Activity Log */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-[#17191B]">
          Activity <span className="pill-word">Log</span>
        </h2>
        {allEvents.length === 0 ? (
          <Card>
            <p className="text-center text-xs text-[#666C72]">No milestones or task events logged yet.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {allEvents.map((event, idx) => (
              <div
                key={idx}
                className="prospera-card flex items-center justify-between p-4 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <Badge tone="blue">
                    {HISTORY_LABELS[event.__kind]}
                  </Badge>
                  <span className="text-xs font-medium text-[#17191B]">
                    {String(event.event ?? event.detail ?? "Milestone update")}
                  </span>
                </div>
                {Boolean(event.created_at) && (
                  <span className="text-[11px] text-[#666C72]">
                    {new Date(String(event.created_at)).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
