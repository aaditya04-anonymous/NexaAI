import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  discussGoal, finalizeRoadmap, generateRoadmap, getGoal, listDiscussion, updateRoadmap,
} from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Discussion, Goal, RoadmapPhase } from "../lib/types";
import { Badge, Button, Card, ErrorNote, Field, Input, Loader, PageHeader, Textarea } from "../components/ui";
import { MarkdownContent } from "../components/MarkdownContent";

export function GoalDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<Discussion[]>([]);
  const [readyForDraft, setReadyForDraft] = useState(false);

  function load() {
    getGoal(id)
      .then((g) => {
        setGoal(g);
        setReadyForDraft(g.roadmap_status !== "not_started");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load this goal."));

    listDiscussion(id)
      .then((turns) => {
        setThread(turns);
        const userTurns = turns.filter((t) => t.role === "user");
        if (userTurns.length >= 4) {
          setReadyForDraft(true);
        }
      })
      .catch(() => {});
  }

  useEffect(load, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!goal) return <Loader label="Retrieving goal details" />;

  const hasRoadmap = Boolean(goal.roadmap && goal.roadmap.phases.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={goal.target_role || "Career Goal"}
        title={goal.title}
        description={goal.description}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={goal.status === "active" ? "mint" : "blue"}>{goal.status}</Badge>
            {goal.roadmap_status && (
              <Badge tone="peach">{goal.roadmap_status}</Badge>
            )}
          </div>
        }
      />

      {!hasRoadmap && (
        <DiscoverySection
          goalId={goal.id}
          thread={thread}
          setThread={setThread}
          readyForDraft={readyForDraft}
          setReadyForDraft={setReadyForDraft}
          onDrafted={load}
        />
      )}

      {hasRoadmap && goal.roadmap && (
        <RoadmapTrail
          roadmap={goal.roadmap}
          onFinalized={() => {
            load();
            navigate("/tasks");
          }}
          onReload={load}
        />
      )}
    </div>
  );
}

function DiscoverySection({
  goalId, thread, setThread, readyForDraft, setReadyForDraft, onDrafted,
}: {
  goalId: string;
  thread: Discussion[];
  setThread: (updater: (prev: Discussion[]) => Discussion[]) => void;
  readyForDraft: boolean;
  setReadyForDraft: (v: boolean) => void;
  onDrafted: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread]);

  useEffect(() => {
    if (thread.length === 0) {
      setThread(() => [{
        id: "intro",
        goal_id: goalId,
        role: "assistant",
        message: "Hello! I am your Nexa Career Advisor. Tell me about your current level of experience, the tools you've used before, and your preferred learning speed. I will formulate a customized roadmap for you.",
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setBusy(true);
    const outgoing = message;
    setMessage("");
    setThread((prev) => [...prev, { id: `tmp-${Date.now()}`, goal_id: goalId, role: "user", message: outgoing }]);
    try {
      const res = await discussGoal(goalId, outgoing);
      setThread((prev) => [...prev, { id: `${res.discussion.id}-reply`, goal_id: goalId, role: "assistant", message: res.reply }]);
      setReadyForDraft(res.ready_for_draft);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  async function onDraft() {
    setDrafting(true);
    setError(null);
    try {
      await generateRoadmap(goalId);
      onDrafted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't draft a roadmap yet.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Interactive Phase</span>
          <h2 className="font-display text-2xl font-bold text-[#17191B]">Discovery Discussion</h2>
        </div>
        <span className="rounded-full bg-[#E5EEF5] px-3.5 py-1 text-xs font-medium text-[#1b3b5a]">
          AI Coach Powered
        </span>
      </div>

      <Card className="max-h-[500px] overflow-y-auto space-y-4 p-6">
        <div className="space-y-4">
          {thread.map((entry) => (
            <div
              key={entry.id}
              className={`flex flex-col ${entry.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#666C72]">
                {entry.role === "user" ? "You" : "Nexa AI"}
              </span>
              <div
                className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed ${
                  entry.role === "user"
                    ? "rounded-br-xs bg-[#17191B] text-white shadow-sm"
                    : "rounded-bl-xs bg-[#F9FBFC] text-[#17191B] border border-[#E2E8F0] shadow-xs"
                }`}
              >
                {entry.role === "user" ? (
                  <div className="whitespace-pre-wrap">{entry.message}</div>
                ) : (
                  <MarkdownContent content={entry.message} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </Card>

      {error && <ErrorNote message={error} />}

      <form onSubmit={onSubmit} className="flex gap-3">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reply with your background, skills, or constraints…"
          disabled={busy}
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !message.trim()}>
          {busy ? "Sending…" : "Send Reply →"}
        </Button>
      </form>

      {readyForDraft && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[26px] border border-[#A9DE9C] bg-[#C9EBC4]/30 p-6 shadow-sm">
          <div>
            <span className="font-display text-lg font-bold text-[#1c4722]">
              Sufficient Context Gathered ✦
            </span>
            <p className="mt-1 text-xs text-[#1c4722]/80">
              Nexa has synthesized your skills, availability, and target role. You can now generate an editable multi-phase roadmap.
            </p>
          </div>
          <Button onClick={onDraft} disabled={drafting} className="shrink-0">
            {drafting ? "Generating Roadmap…" : "Generate Structured Roadmap →"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RoadmapTrail({
  roadmap, onFinalized, onReload,
}: {
  roadmap: Goal["roadmap"];
  onFinalized: () => void;
  onReload: () => void;
}) {
  const [phases, setPhases] = useState<RoadmapPhase[]>(roadmap!.phases);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPhases(roadmap!.phases), [roadmap]);

  const isFinalized = roadmap!.status === "finalized";

  function updatePhase(idx: number, patch: Partial<RoadmapPhase>) {
    setPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function removePhase(idx: number) {
    setPhases((prev) => prev.filter((_, i) => i !== idx));
  }

  function addPhase() {
    setPhases((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: "New Learning Phase",
        description: "Milestones and core competencies for this phase.",
        skills: ["Skill 1", "Skill 2"],
        estimated_minutes: 300,
        priority: "medium",
      },
    ]);
  }

  async function saveEdits() {
    setBusy(true);
    setError(null);
    try {
      await updateRoadmap(
        roadmap!.id,
        phases.map((p) => ({
          title: p.title,
          description: p.description,
          skills: p.skills,
          estimated_minutes: p.estimated_minutes,
          priority: p.priority,
        }))
      );
      setEditing(false);
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your edits.");
    } finally {
      setBusy(false);
    }
  }

  async function onFinalize() {
    setBusy(true);
    setError(null);
    try {
      await finalizeRoadmap(roadmap!.id);
      onFinalized();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't finalize the roadmap.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4E7E8] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
            {isFinalized ? "Active Plan" : "Draft Proposal"}
          </span>
          <h2 className="font-display text-2xl font-bold text-[#17191B]">
            Roadmap {isFinalized ? "Milestones" : "Review"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isFinalized && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit Phases ✎
            </Button>
          )}
          {editing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhases(roadmap!.phases);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdits} disabled={busy}>
                {busy ? "Saving…" : "Save Changes"}
              </Button>
            </>
          )}
          {!isFinalized && !editing && (
            <Button size="sm" onClick={onFinalize} disabled={busy}>
              {busy ? "Finalizing…" : "Finalize & Unlock Daily Tasks →"}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="space-y-4">
        {phases.map((phase, idx) => (
          <div
            key={phase.id}
            className="prospera-card relative p-6 transition-all"
          >
            {editing ? (
              <div className="space-y-4">
                <Field label="Phase Title">
                  <Input
                    value={phase.title}
                    onChange={(e) => updatePhase(idx, { title: e.target.value })}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={phase.description ?? ""}
                    onChange={(e) => updatePhase(idx, { description: e.target.value })}
                  />
                </Field>
                <div className="flex items-center gap-4">
                  <Field label="Est. Minutes">
                    <Input
                      type="number"
                      min={15}
                      value={phase.estimated_minutes}
                      onChange={(e) => updatePhase(idx, { estimated_minutes: Number(e.target.value) })}
                    />
                  </Field>
                  <Button variant="danger" size="sm" onClick={() => removePhase(idx)} className="mt-5">
                    Remove Phase
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17191B] text-xs font-bold text-white">
                      0{idx + 1}
                    </span>
                    <h3 className="font-display text-xl font-bold text-[#17191B]">
                      {phase.title}
                    </h3>
                    <Badge tone={phase.priority === "high" ? "peach" : "blue"}>
                      {phase.priority} priority
                    </Badge>
                  </div>

                  {phase.description && (
                    <p className="text-sm leading-relaxed text-[#666C72]">
                      {phase.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs font-semibold text-[#666C72]">
                      ⏱ ~{Math.round(phase.estimated_minutes / 60)} hrs
                    </span>
                    {phase.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-[#F3F4F2] border border-[#E4E7E8] px-3 py-0.5 text-xs font-medium text-[#17191B]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge tone={phase.status === "completed" ? "mint" : "blue"}>
                    {phase.status || "Not started"}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Button variant="secondary" size="sm" onClick={addPhase}>
          + Add Milestone Phase
        </Button>
      )}

      {isFinalized && (
        <div className="mt-8 flex items-center justify-between rounded-3xl bg-[#E5EEF5] p-6 border border-[#B7D3E7]/40">
          <div>
            <p className="font-display font-bold text-[#1b3b5a]">Roadmap is Finalized & Active</p>
            <p className="text-xs text-[#1b3b5a]/80">Daily actionable tasks are generated from the active phase.</p>
          </div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 rounded-full bg-[#17191B] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black transition-all"
          >
            Generate Today's Tasks →
          </Link>
        </div>
      )}
    </div>
  );
}
