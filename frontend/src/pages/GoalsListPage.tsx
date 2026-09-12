import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createGoal, listGoals } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Goal } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Loader, PageHeader, Textarea } from "../components/ui";

const STATUS_TONE: Record<string, "brass" | "moss" | "ember"> = {
  discovery: "brass",
  discussion: "brass",
  draft: "ember",
  active: "moss",
  paused: "brass",
  completed: "moss",
};

export function GoalsListPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    listGoals()
      .then(setGoals)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load goals."));
  }

  useEffect(load, []);

  return (
    <div>
      <PageHeader
        eyebrow="Goals"
        title="Goals & roadmap"
        description="Every goal starts as a discovery conversation, then becomes an editable roadmap you finalize."
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New goal"}</Button>}
      />

      {showForm && (
        <div className="mb-8">
          <NewGoalForm
            onCreated={(goal) => {
              setShowForm(false);
              setGoals((prev) => (prev ? [goal, ...prev] : [goal]));
            }}
          />
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {!goals && !error && <Loader label="Loading goals" />}
      {goals && goals.length === 0 && (
        <EmptyState title="No goals yet" body="Add your first career goal to begin the discovery conversation." />
      )}
      {goals && goals.length > 0 && (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Link to={`/goals/${goal.id}`} className="block rounded-md border border-rule p-4 transition-colors hover:border-ink/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg text-ink">{goal.title}</p>
                    {goal.target_role && <p className="text-sm text-ink-soft">Target: {goal.target_role}</p>}
                  </div>
                  <Badge tone={STATUS_TONE[goal.status] ?? "brass"}>{goal.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewGoalForm({ onCreated }: { onCreated: (goal: Goal) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const goal = await createGoal({
        title,
        description: description || undefined,
        target_role: targetRole || undefined,
        daily_minutes: dailyMinutes,
      });
      onCreated(goal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that goal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Goal title">
          <Input required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Become a backend engineer" />
        </Field>
        <Field label="Target role" hint="Optional">
          <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Backend Engineer" />
        </Field>
        <Field label="Description" hint="Optional — more context helps the roadmap">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Where you're starting from, what draws you to this." />
        </Field>
        <Field label="Daily minutes" hint="How long you can realistically practice each day">
          <Input type="number" min={15} max={720} value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create goal"}</Button>
      </form>
    </Card>
  );
}
