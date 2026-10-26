import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createGoal, listGoals } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Goal } from "../lib/types";
import { Badge, Button, Card, CircleArrow, EmptyState, ErrorNote, Field, Input, Loader, PageHeader, Textarea } from "../components/ui";

const STATUS_TONE: Record<string, "blue" | "mint" | "peach" | "lavender"> = {
  discovery: "blue",
  discussion: "blue",
  draft: "peach",
  active: "mint",
  paused: "lavender",
  completed: "mint",
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Career Vision"
        title="Goals &"
        pillHighlight="Roadmaps"
        description="Every career transition begins with an AI discovery conversation, turns into a structured editable roadmap, and drives your daily execution."
        action={
          <Button
            onClick={() => setShowForm((v) => !v)}
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? "Cancel" : "+ New Career Goal"}
          </Button>
        }
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
      {!goals && !error && <Loader label="Retrieving your career roadmaps" />}

      {goals && goals.length === 0 && (
        <EmptyState
          title="No Career Goals Set Yet"
          body="Add your target role or next career step to start the interactive AI discovery interview."
          action={
            <Button onClick={() => setShowForm(true)}>
              Create Your First Goal →
            </Button>
          }
        />
      )}

      {goals && goals.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {goals.map((goal, idx) => (
            <Link
              key={goal.id}
              to={`/goals/${goal.id}`}
              className="group block"
            >
              <div className="prospera-card flex h-full flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#666C72]">
                      0{idx + 1} //
                    </span>
                    <Badge tone={STATUS_TONE[goal.status] ?? "blue"}>
                      {goal.status}
                    </Badge>
                  </div>

                  <h3 className="font-display text-2xl font-bold text-[#17191B] group-hover:text-black">
                    {goal.title}
                  </h3>

                  {goal.target_role && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
                      Target: {goal.target_role}
                    </p>
                  )}

                  {goal.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#666C72]">
                      {goal.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E4E7E8] pt-4">
                  <div className="flex items-center gap-2 text-xs text-[#666C72]">
                    <span>⏱ {goal.daily_minutes ?? 60} mins/day</span>
                    {goal.roadmap_status && (
                      <span className="capitalize">• {goal.roadmap_status}</span>
                    )}
                  </div>
                  <CircleArrow direction="up-right" />
                </div>
              </div>
            </Link>
          ))}
        </div>
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
    <Card className="bg-gradient-to-br from-white to-[#F8F9F8]">
      <div className="mb-6 flex items-center justify-between border-b border-[#E4E7E8] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Initiate</span>
          <h2 className="font-display text-2xl font-bold text-[#17191B]">Set New Career Target</h2>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error && <ErrorNote message={error} />}
        
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Goal Title">
            <Input
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Machine Learning Engineer"
            />
          </Field>
          <Field label="Target Role" hint="Specific job title you want to reach">
            <Input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Staff AI Engineer"
            />
          </Field>
        </div>

        <Field label="Description & Context" hint="Where you are starting from, what you know, and your target timeline">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I currently know Python and basic SQL, and want to learn Transformers, RAG systems, and production LLM orchestration..."
          />
        </Field>

        <Field label="Daily Practice Commitment" hint="How many minutes you can realistically dedicate each day">
          <Input
            type="number"
            min={15}
            max={720}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating Goal…" : "Begin Discovery Conversation →"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
