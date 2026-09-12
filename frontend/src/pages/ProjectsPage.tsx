import { useEffect, useState, type FormEvent } from "react";
import { createProject, listProjects } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Project } from "../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Loader, PageHeader, Select, Textarea } from "../components/ui";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load projects."));
  }

  useEffect(load, []);

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Projects"
        description="Portfolio-style projects that apply what you're learning."
        action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New project"}</Button>}
      />

      {showForm && (
        <div className="mb-8">
          <NewProjectForm onCreated={(p) => { setShowForm(false); setProjects((prev) => [p, ...(prev ?? [])]); }} />
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {!projects && !error && <Loader label="Loading projects" />}
      {projects && projects.length === 0 && <EmptyState title="No projects yet" body="Create a project to apply what you're learning to something real." />}
      {projects && projects.length > 0 && (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg text-ink">{p.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">{p.objective}</p>
                  </div>
                  <Badge>{p.difficulty}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.technologies.map((t) => <Badge key={t} tone="brass">{t}</Badge>)}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {p.milestones.map((m, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-ink-soft">
                      <span className={`h-1.5 w-1.5 rounded-full ${m.status === "completed" ? "bg-moss" : "bg-brass"}`} />
                      {m.title}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewProjectForm({ onCreated }: { onCreated: (p: Project) => void }) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [difficulty, setDifficulty] = useState<Project["difficulty"]>("foundation");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await createProject({ title, objective, difficulty });
      onCreated(project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Title">
          <Input required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Personal finance tracker API" />
        </Field>
        <Field label="Objective">
          <Textarea required minLength={3} rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What this project should demonstrate" />
        </Field>
        <Field label="Difficulty">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Project["difficulty"])}>
            <option value="foundation">Foundation</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create project"}</Button>
      </form>
    </Card>
  );
}
