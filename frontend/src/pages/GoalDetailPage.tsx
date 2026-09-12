import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  discussGoal, finalizeRoadmap, generateRoadmap, getGoal, updateRoadmap,
} from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Discussion, Goal, RoadmapPhase } from "../lib/types";
import { Badge, Button, Card, ErrorNote, Input, Loader, PageHeader, Textarea } from "../components/ui";

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
  }

  useEffect(load, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!goal) return <Loader label="Opening goal" />;

  const hasRoadmap = Boolean(goal.roadmap && goal.roadmap.phases.length > 0);

  return (
    <div>
      <PageHeader
        eyebrow={goal.target_role ?? "Goal"}
        title={goal.title}
        description={goal.description}
        action={<Badge tone={goal.status === "active" ? "moss" : "brass"}>{goal.status}</Badge>}
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
        id: "intro", goal_id: goalId, role: "assistant",
        message: "Tell me what's motivating this goal, what experience you already have, and how you'd like to learn. Send that whenever you're ready — I'll ask a few follow-ups before drafting a roadmap.",
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
    <div>
      <p className="mb-3 font-display text-lg text-ink">Discovery</p>
      <Card className="max-h-[420px] overflow-y-auto">
        <div className="space-y-4">
          {thread.map((entry) => (
            <div key={entry.id} className={entry.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] rounded-md px-3.5 py-2.5 text-left text-sm ${
                  entry.role === "user" ? "bg-ink text-paper" : "bg-surface text-ink"
                }`}
              >
                {entry.message}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </Card>

      {error && <div className="mt-3"><ErrorNote message={error} /></div>}

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reply to continue the discovery conversation…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !message.trim()}>Send</Button>
      </form>

      {readyForDraft && (
        <div className="mt-5 flex items-center justify-between rounded-md border border-moss/30 bg-moss-tint px-4 py-3">
          <p className="text-sm text-moss-deep">Enough context to draft a roadmap.</p>
          <Button onClick={onDraft} disabled={drafting}>{drafting ? "Drafting…" : "Draft roadmap"}</Button>
        </div>
      )}
    </div>
  );
}

function RoadmapTrail({ roadmap, onFinalized, onReload }: { roadmap: Goal["roadmap"]; onFinalized: () => void; onReload: () => void }) {
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
    setPhases((prev) => [...prev, { id: `new-${Date.now()}`, title: "New phase", description: "", skills: [], estimated_minutes: 300, priority: "medium" }]);
  }

  async function saveEdits() {
    setBusy(true);
    setError(null);
    try {
      await updateRoadmap(
        roadmap!.id,
        phases.map((p) => ({
          title: p.title, description: p.description, skills: p.skills,
          estimated_minutes: p.estimated_minutes, priority: p.priority,
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-lg text-ink">Roadmap {isFinalized ? "" : "draft"}</p>
        <div className="flex gap-2">
          {!isFinalized && !editing && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit phases</Button>}
          {editing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setPhases(roadmap!.phases); setEditing(false); }}>Cancel</Button>
              <Button size="sm" onClick={saveEdits} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </>
          )}
          {!isFinalized && !editing && <Button size="sm" onClick={onFinalize} disabled={busy}>{busy ? "Finalizing…" : "Finalize roadmap"}</Button>}
        </div>
      </div>

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <ol className="relative space-y-5 pl-8">
        <div className="trail-line absolute top-2 bottom-2 left-[11px] w-px" />
        {phases.map((phase, idx) => (
          <li key={phase.id} className="relative">
            <span className={`absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
              phase.status === "completed" ? "border-moss bg-moss text-paper" : "border-brass bg-paper text-brass"
            }`}>
              {idx + 1}
            </span>
            <Card>
              {editing ? (
                <div className="space-y-3">
                  <Input value={phase.title} onChange={(e) => updatePhase(idx, { title: e.target.value })} />
                  <Textarea rows={2} value={phase.description ?? ""} onChange={(e) => updatePhase(idx, { description: e.target.value })} />
                  <div className="flex gap-3">
                    <Input
                      type="number" min={15} className="w-32"
                      value={phase.estimated_minutes}
                      onChange={(e) => updatePhase(idx, { estimated_minutes: Number(e.target.value) })}
                    />
                    <Button variant="danger" size="sm" onClick={() => removePhase(idx)}>Remove phase</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg text-ink">{phase.title}</p>
                    <Badge tone={phase.priority === "high" ? "ember" : "brass"}>{phase.priority}</Badge>
                  </div>
                  {phase.description && <p className="mt-1.5 text-sm text-ink-soft">{phase.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span>{Math.round(phase.estimated_minutes / 60)} hrs estimated</span>
                    {phase.skills.map((s) => <Badge key={s}>{s}</Badge>)}
                  </div>
                </>
              )}
            </Card>
          </li>
        ))}
      </ol>

      {editing && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={addPhase}>+ Add phase</Button>
      )}

      {isFinalized && (
        <div className="mt-6">
          <Link to="/tasks" className="text-sm text-ember-deep hover:underline">Go generate today's tasks →</Link>
        </div>
      )}
    </div>
  );
}
