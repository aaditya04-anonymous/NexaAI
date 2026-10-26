import { useEffect, useState, type FormEvent } from "react";
import { createProject, listProjects } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { Project } from "../lib/types";
import { Badge, Button, Card, CircleArrow, EmptyState, ErrorNote, Field, Input, Loader, PageHeader, Select, Textarea } from "../components/ui";

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hands-On Evidence"
        title="Portfolio &"
        pillHighlight="Applied Projects"
        description="End-to-end projects demonstrating your skills in production, ready for GitHub and employer review."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ New Project"}
          </Button>
        }
      />

      {showForm && (
        <div className="mb-8">
          <NewProjectForm
            onCreated={(p) => {
              setShowForm(false);
              setProjects((prev) => [p, ...(prev ?? [])]);
            }}
          />
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {!projects && !error && <Loader label="Loading portfolio projects" />}
      
      {projects && projects.length === 0 && (
        <EmptyState
          title="No Projects Initiated Yet"
          body="Create an applied project to demonstrate proof of skill for your target role."
          action={
            <Button onClick={() => setShowForm(true)}>
              Draft First Project →
            </Button>
          }
        />
      )}

      {projects && projects.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p, idx) => (
            <div key={p.id} className="prospera-card flex flex-col justify-between p-7">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#666C72]">
                    Project 0{idx + 1}
                  </span>
                  <Badge tone={p.difficulty === "advanced" ? "peach" : p.difficulty === "intermediate" ? "blue" : "mint"}>
                    {p.difficulty}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-display text-2xl font-bold text-[#17191B]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#666C72]">
                    {p.objective}
                  </p>
                </div>

                {p.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.technologies.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#E5EEF5] border border-[#B7D3E7]/40 px-2.5 py-0.5 text-[11px] font-medium text-[#1b3b5a]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {p.milestones?.length > 0 && (
                  <div className="rounded-2xl bg-[#F8F9F8] p-4 border border-[#E4E7E8]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#666C72] mb-2">
                      Key Deliverables
                    </p>
                    <ul className="space-y-2">
                      {p.milestones.map((m, mIdx) => (
                        <li key={mIdx} className="flex items-center gap-2 text-xs text-[#17191B]">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              m.status === "completed" ? "bg-[#A9DE9C]" : "bg-[#17191B]"
                            }`}
                          />
                          <span>{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#E4E7E8] pt-4">
                <span className="text-xs text-[#666C72]">
                  Status: <strong className="text-[#17191B] capitalize">{p.status}</strong>
                </span>
                <CircleArrow direction="up-right" />
              </div>
            </div>
          ))}
        </div>
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
    <Card className="bg-gradient-to-br from-white to-[#F8F9F8]">
      <div className="mb-6 flex items-center justify-between border-b border-[#E4E7E8] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Portfolio Scope</span>
          <h2 className="font-display text-2xl font-bold text-[#17191B]">Create Portfolio Project</h2>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Project Title">
          <Input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. End-to-End Enterprise RAG Engine with Evaluator"
          />
        </Field>
        <Field label="Objective & Architecture" hint="What core competencies will this project demonstrate?">
          <Textarea
            required
            minLength={3}
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Build and deploy a scalable RAG pipeline using Groq and vector database with automated evaluation metrics..."
          />
        </Field>
        <Field label="Complexity Tier">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Project["difficulty"])}>
            <option value="foundation">Foundation</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </Field>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Drafting Architecture…" : "Create Project →"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
