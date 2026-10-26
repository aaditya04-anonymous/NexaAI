import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Dashboard } from "../lib/types";
import { Badge, Card, CircleArrow, EmptyState, ErrorNote, Loader, ProgressBar } from "../components/ui";

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

  if (loading) return <Loader label="Compiling your growth log" />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const { career_snapshot, today, ai_insight, progress } = data;
  const hasGoal = Boolean(career_snapshot.goal);

  return (
    <div className="space-y-8">
      {/* Top Editorial Hero Banner (Prospera Signature Style) */}
      <section className="relative overflow-hidden rounded-[30px] border border-[#E4E7E8] bg-white p-7 md:p-10 shadow-[0_8px_30px_-4px_rgba(23,25,27,0.04)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E5EEF5] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
                Today's Overview
              </span>
              <span className="text-xs text-[#666C72] font-mono">
                // {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold leading-[1.25] tracking-tight text-[#17191B] sm:text-4xl md:text-5xl">
              Building toward{" "}
              <span className="pill-word">
                {career_snapshot.target_profession || "Target Role"}
              </span>
            </h1>

            <p className="text-sm md:text-base leading-relaxed text-[#666C72]">
              {ai_insight || "Your roadmap is actively calibrating daily tasks and learning milestones against industry market requirements."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/tasks"
                className="inline-flex items-center gap-2 rounded-full bg-[#17191B] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition-all"
              >
                Execute Today's Plan <CircleArrow direction="right" className="!h-5 !w-5 !border-0 !bg-transparent !text-white" />
              </Link>
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 rounded-full bg-[#E5EEF5] px-5 py-2.5 text-xs font-semibold text-[#1b3b5a] hover:bg-[#B7D3E7]/70 transition-all"
              >
                Discuss with AI Coach ↗
              </Link>
            </div>
          </div>

          {/* Quick Snapshot Card on Right */}
          <div className="flex w-full flex-col justify-between rounded-3xl bg-gradient-to-br from-[#E5EEF5] to-[#F3F4F2] p-6 lg:max-w-xs border border-[#E4E7E8]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#666C72]">Current Track</p>
              <p className="font-display text-xl font-bold text-[#17191B]">
                {career_snapshot.profession || "Career Architect"}
              </p>
            </div>

            <div className="my-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#666C72]">
                <span>Overall Goal Progress</span>
                <span className="font-bold text-[#17191B]">{Math.round(career_snapshot.progress ?? 0)}%</span>
              </div>
              <ProgressBar value={career_snapshot.progress ?? 0} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E4E7E8]/70 text-xs">
              <span className="text-[#666C72]">AI Provider:</span>
              <span className="rounded-full bg-[#C9EBC4] px-2.5 py-0.5 text-[11px] font-semibold text-[#1c4722]">
                Groq Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      {!hasGoal ? (
        <EmptyState
          title="No Active Career Goal Found"
          body="Begin by setting your target profession and discussing your technical background with Nexa AI."
          action={
            <Link
              to="/goals"
              className="inline-flex items-center gap-2 rounded-full bg-[#17191B] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black transition-all"
            >
              Set Career Goal →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Active Phase Card (7 cols) */}
          <div className="md:col-span-7">
            <Card className="h-full flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#E5EEF5] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
                    Active Phase
                  </span>
                  <Link to="/goals" className="text-xs font-medium text-[#666C72] hover:text-[#17191B]">
                    View Roadmap →
                  </Link>
                </div>

                {career_snapshot.current_phase ? (
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl font-bold text-[#17191B]">
                      {career_snapshot.current_phase.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#666C72]">
                      {career_snapshot.current_phase.description || "Core foundation skills and practical milestones for this development phase."}
                    </p>

                    {career_snapshot.current_phase.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {career_snapshot.current_phase.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#F3F4F2] border border-[#E4E7E8] px-3 py-1 text-xs font-medium text-[#17191B]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#666C72]">No active roadmap phase. Finalize a draft to start.</p>
                )}
              </div>

              <div className="mt-6 border-t border-[#E4E7E8] pt-4">
                <div className="flex items-center justify-between text-xs text-[#666C72]">
                  <span>Estimated Phase Time</span>
                  <span className="font-semibold text-[#17191B]">
                    {career_snapshot.current_phase?.estimated_minutes ? `${career_snapshot.current_phase.estimated_minutes} mins` : "Self-paced"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Asymmetric Weekly Metrics (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-[#FFFFFF]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#666C72]">Completed</p>
                <p className="font-display mt-2 text-4xl font-extrabold text-[#17191B]">
                  {progress.completed_tasks}
                </p>
                <p className="mt-1 text-xs text-[#666C72]">Verified tasks</p>
              </Card>

              <Card className="bg-[#FFFFFF]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#666C72]">Roadmaps</p>
                <p className="font-display mt-2 text-4xl font-extrabold text-[#17191B]">
                  {progress.active_goals}
                </p>
                <p className="mt-1 text-xs text-[#666C72]">Active paths</p>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-[#FFFFFF] to-[#F3F4F2]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#666C72]">Due or Overdue</p>
                  <p className={`font-display mt-1 text-3xl font-extrabold ${progress.overdue_tasks > 0 ? "text-rose-600" : "text-[#17191B]"}`}>
                    {progress.overdue_tasks}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5EEF5]">
                  <span className="text-sm">⚡</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#666C72]">
                {progress.overdue_tasks === 0 ? "All caught up on scheduled tasks!" : "Needs your attention today."}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Today's Tasks & Recommendations Section (Prospera 3-column Card Aesthetic) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Today's Tasks (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[#17191B]">
              Today's <span className="pill-word">Action Plan</span>
            </h2>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17191B] hover:underline"
            >
              View Full Task Queue →
            </Link>
          </div>

          {today.tasks.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#C9EBC4] text-[#1c4722]">
                  ✓
                </div>
                <p className="font-display font-semibold text-[#17191B]">No tasks scheduled for today</p>
                <p className="mt-1 text-xs text-[#666C72]">Generate daily tasks from your current roadmap phase.</p>
                <Link
                  to="/tasks"
                  className="mt-4 rounded-full bg-[#17191B] px-4 py-2 text-xs font-medium text-white hover:bg-black transition-all"
                >
                  Generate Daily Tasks
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {today.tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="prospera-card flex items-center justify-between p-4 md:p-5 transition-transform hover:translate-x-1"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#17191B]">
                      {task.title || task.description || "Untitled task"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#666C72]">
                      {task.estimated_minutes && <span>⏱ {task.estimated_minutes} min</span>}
                      {task.category && <span className="capitalize">• {task.category}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={task.status === "completed" ? "mint" : "blue"}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Link to="/tasks">
                      <CircleArrow direction="right" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Next Action (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#17191B]">
            Recommended <span className="pill-word-mint">Next</span>
          </h2>

          {today.recommended_action ? (
            <Card className="bg-gradient-to-b from-[#C9EBC4]/30 to-white flex flex-col justify-between">
              <div className="space-y-3">
                <span className="rounded-full bg-[#C9EBC4] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#1c4722]">
                  High Priority
                </span>
                <h3 className="font-display text-xl font-bold text-[#17191B]">
                  {today.recommended_action.title}
                </h3>
                <p className="text-xs leading-relaxed text-[#666C72]">
                  {today.recommended_action.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E4E7E8]">
                <Link
                  to="/recommendations"
                  className="inline-flex w-full items-center justify-between rounded-full bg-[#17191B] px-4 py-2.5 text-xs font-medium text-white hover:bg-black transition-all"
                >
                  <span>Take Action</span>
                  <span>→</span>
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-xs text-[#666C72]">
                As you complete tasks, Nexa AI formulates contextual recommendations based on current labor market skills.
              </p>
              <Link
                to="/recommendations"
                className="mt-4 inline-block text-xs font-semibold text-[#17191B] hover:underline"
              >
                Browse all recommendations →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
