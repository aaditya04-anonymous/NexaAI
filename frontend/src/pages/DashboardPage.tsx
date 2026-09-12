import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Dashboard } from "../lib/types";
import { Badge, Card, EmptyState, ErrorNote, Loader, PageHeader, ProgressBar } from "../components/ui";

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Reading your log" />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const { career_snapshot, today, ai_insight, progress } = data;
  const hasGoal = Boolean(career_snapshot.goal);

  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title={career_snapshot.profession ? `Building toward ${career_snapshot.target_profession ?? "your next role"}` : "Your growth log"}
        description={ai_insight}
      />

      {!hasGoal ? (
        <EmptyState
          title="No active goal yet"
          body="Set a career goal to start the discovery conversation and generate a roadmap."
          action={<Link to="/goals" className="text-sm text-ember-deep hover:underline">Set a goal →</Link>}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <p className="text-sm text-ink-soft">Current phase</p>
            {career_snapshot.current_phase ? (
              <>
                <p className="mt-1 font-display text-xl text-ink">{career_snapshot.current_phase.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{career_snapshot.current_phase.description}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">No phase in progress — finalize a roadmap to begin.</p>
            )}
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-ink-soft">
                <span>Goal progress</span>
                <span>{Math.round(career_snapshot.progress ?? 0)}%</span>
              </div>
              <ProgressBar value={career_snapshot.progress ?? 0} />
            </div>
          </Card>

          <Card>
            <p className="text-sm text-ink-soft">This week</p>
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display text-2xl text-ink">{progress.completed_tasks}</p>
                <p className="text-xs text-ink-soft">Tasks done</p>
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
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg text-ink">Today's tasks</p>
          <Link to="/tasks" className="text-sm text-ink-soft hover:text-ink">View all →</Link>
        </div>
        {today.tasks.length === 0 ? (
          <EmptyState title="Nothing queued for today" body="Generate today's tasks from your roadmap's current phase." />
        ) : (
          <ul className="divide-y divide-rule rounded-md border border-rule">
            {today.tasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-ink">{task.title ?? task.description ?? "Untitled task"}</p>
                  {task.estimated_minutes && <p className="text-xs text-ink-soft">{task.estimated_minutes} min</p>}
                </div>
                <Badge tone={task.status === "completed" ? "moss" : "brass"}>{task.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {today.recommended_action && (
        <div className="mt-8">
          <p className="mb-3 font-display text-lg text-ink">Recommended next</p>
          <Card>
            <p className="font-display text-lg text-ink">{today.recommended_action.title}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{today.recommended_action.description}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
