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
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Today's tasks"
        description="Generated from the current phase of your finalized roadmap and your daily time budget."
        action={<Button onClick={onGenerate} disabled={generating}>{generating ? "Generating…" : "Generate today's tasks"}</Button>}
      />

      {error && <div className="mb-6"><ErrorNote message={error} /></div>}
      {!tasks && !error && <Loader label="Loading tasks" />}
      {tasks && tasks.length === 0 && (
        <EmptyState
          title="No tasks queued for today"
          body="Finalize a roadmap, then generate today's tasks."
          action={<Link to="/goals" className="text-sm text-ember-deep hover:underline">Go to goals →</Link>}
        />
      )}

      {tasks && tasks.length > 0 && (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} onUpdated={(t) => setTasks((prev) => prev!.map((x) => (x.id === t.id ? t : x)))} />
            </li>
          ))}
        </ul>
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
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-sm ${isDone ? "text-ink-soft line-through" : "text-ink"}`}>{task.title ?? task.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            {task.category && <span>{task.category}</span>}
            {task.estimated_minutes && <span>· {task.estimated_minutes} min</span>}
            {task.due_date && <span>· due {task.due_date}</span>}
          </div>
        </div>
        <Badge tone={isDone ? "moss" : task.status === "in_progress" ? "ember" : "brass"}>{task.status.replace("_", " ")}</Badge>
      </div>

      {!isDone && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => markComplete(100)} disabled={busy}>Mark complete</Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Add reflection"}</Button>
          <Button size="sm" variant="ghost" onClick={onGenerateLearning} disabled={learningBusy}>
            {learningBusy ? "Preparing lesson…" : "Get a lesson for this"}
          </Button>
        </div>
      )}

      {open && !isDone && (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did you learn or get stuck on?" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => markComplete(50)} disabled={busy}>Save as in progress</Button>
            <Button size="sm" onClick={() => markComplete(100)} disabled={busy}>Complete with reflection</Button>
          </div>
        </div>
      )}

      {error && <div className="mt-2"><ErrorNote message={error} /></div>}
    </Card>
  );
}
