import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { completeTask, generateDailyTasks, generateLearning, getTodaysTasks } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Task } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Loader, PageHeader, Textarea } from "../components/ui";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  function load() {
    getTodaysTasks()
      .then(setTasks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load today's tasks."));
  }

  useEffect(load, []);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const created = await generateDailyTasks();
      setTasks((prev) => [...(prev ?? []), ...created]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate tasks — finalize a roadmap first.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily Practice"
        title="Execution &"
        pillHighlight="Daily Tasks"
        description="Generated directly from the active phase of your finalized roadmap to fit your daily availability."
        action={
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? "Generating Plan…" : "+ Generate Today's Tasks"}
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}
      {!tasks && !error && <Loader label="Loading today's practice tasks" />}
      
      {tasks && tasks.length === 0 && (
        <EmptyState
          title="No Tasks Queued For Today"
          body="Finalize your career roadmap, then generate your tailored daily practice tasks."
          action={
            <Link
              to="/goals"
              className="inline-flex items-center gap-2 rounded-full bg-[#17191B] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition-all"
            >
              Go to Goals & Roadmap →
            </Link>
          }
        />
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdated={(t) => setTasks((prev) => prev!.map((x) => (x.id === t.id ? t : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onUpdated }: { task: Task; onUpdated: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  const [reflection, setReflection] = useState(task.reflection ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);

  const isDone = task.status === "completed";

  async function markComplete(percentage: number) {
    setBusy(true);
    setError(null);
    try {
      const updated = await completeTask(task.id, percentage, reflection || undefined);
      onUpdated(updated);
      if (percentage === 100) setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update this task.");
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateLearning() {
    setLearningBusy(true);
    setError(null);
    try {
      await generateLearning(task.id);
      window.location.href = "/learning";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a lesson for this task.");
    } finally {
      setLearningBusy(false);
    }
  }

  return (
    <Card className={`transition-all duration-200 ${isDone ? "bg-[#F8F9F8] opacity-80" : "bg-white"}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className={`font-display text-base font-bold ${isDone ? "text-[#666C72] line-through" : "text-[#17191B]"}`}>
            {task.title ?? task.description}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#666C72]">
            {task.category && (
              <span className="rounded-full bg-[#F3F4F2] px-2.5 py-0.5 font-medium uppercase text-[10px] text-[#17191B]">
                {task.category}
              </span>
            )}
            {task.estimated_minutes && <span>⏱ {task.estimated_minutes} min practice</span>}
            {task.due_date && <span>• Due {task.due_date}</span>}
          </div>
        </div>

        <div className="shrink-0">
          <Badge tone={isDone ? "mint" : task.status === "in_progress" ? "peach" : "blue"}>
            {task.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {!isDone && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[#E4E7E8]">
          <Button size="sm" onClick={() => markComplete(100)} disabled={busy}>
            ✓ Complete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Close Reflection" : "Log Reflection ✎"}
          </Button>
          <Button size="sm" variant="pill-light" onClick={onGenerateLearning} disabled={learningBusy}>
            {learningBusy ? "Preparing Lesson…" : "Generate AI Lesson ↗"}
          </Button>
        </div>
      )}

      {open && !isDone && (
        <div className="mt-4 rounded-2xl bg-[#E5EEF5]/40 p-4 space-y-3 border border-[#B7D3E7]/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
            Evidence & Reflection
          </p>
          <Textarea
            rows={2}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Record what concept clicked, code implemented, or friction faced today…"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => markComplete(50)} disabled={busy}>
              Save Progress (50%)
            </Button>
            <Button size="sm" onClick={() => markComplete(100)} disabled={busy}>
              Submit with Evidence (100%)
            </Button>
          </div>
        </div>
      )}

      {error && <div className="mt-3"><ErrorNote message={error} /></div>}
    </Card>
  );
}
