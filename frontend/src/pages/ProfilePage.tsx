import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { changePassword, updateCareerProfile } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea, PageHeader } from "../components/ui";

function listToText(list?: string[]) { return (list ?? []).join(", "); }
function textToList(text: string) { return text.split(",").map((s) => s.trim()).filter(Boolean); }

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const p = user?.profile ?? {};

  const [name, setName] = useState(p.name ?? "");
  const [profession, setProfession] = useState(p.profession ?? "");
  const [currentRole, setCurrentRole] = useState(p.current_role ?? "");
  const [experienceLevel, setExperienceLevel] = useState(p.experience_level ?? "");
  const [currentSkills, setCurrentSkills] = useState(listToText(p.current_skills));
  const [targetSkills, setTargetSkills] = useState(listToText(p.target_skills));
  const [interests, setInterests] = useState(listToText(p.interests));
  const [learningStyle, setLearningStyle] = useState(p.preferred_learning_style ?? "");
  const [learningMinutes, setLearningMinutes] = useState(p.preferred_learning_duration_minutes ?? 60);
  const [objectives, setObjectives] = useState(p.career_objectives ?? "");
  const [memoryEnabled, setMemoryEnabled] = useState(p.memory_enabled ?? true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(false);
  }, [name, profession, currentRole, experienceLevel, currentSkills, targetSkills, interests, learningStyle, learningMinutes, objectives, memoryEnabled]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateCareerProfile({
        name: name || undefined,
        profession: profession || undefined,
        current_role: currentRole || undefined,
        experience_level: experienceLevel || undefined,
        current_skills: textToList(currentSkills),
        target_skills: textToList(targetSkills),
        interests: textToList(interests),
        preferred_learning_style: learningStyle || undefined,
        preferred_learning_duration_minutes: learningMinutes,
        career_objectives: objectives || undefined,
        memory_enabled: memoryEnabled,
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Context Calibration"
        title="Career Profile &"
        pillHighlight="Identity"
        description="This foundational context calibrates every roadmap phase, daily practice task, and AI coach recommendation."
      />

      <Card>
        <div className="mb-6 flex items-center justify-between border-b border-[#E4E7E8] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Professional Profile</span>
            <h2 className="font-display text-2xl font-bold text-[#17191B]">Background & Focus Areas</h2>
          </div>
          {saved && (
            <span className="rounded-full bg-[#C9EBC4] px-3.5 py-1 text-xs font-semibold text-[#1c4722]">
              Changes Saved ✓
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {error && <ErrorNote message={error} />}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aaditya" />
            </Field>
            <Field label="Target Career Field">
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="AI Engineering" />
            </Field>
            <Field label="Current Role">
              <Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="Software Engineer" />
            </Field>
            <Field label="Experience Seniority">
              <Select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option value="">Not specified</option>
                <option value="entry">Entry-Level</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
              </Select>
            </Field>
          </div>

          <Field label="Current Skills" hint="Comma-separated competencies you are already proficient in">
            <Input
              value={currentSkills}
              onChange={(e) => setCurrentSkills(e.target.value)}
              placeholder="Python, FastAPI, Docker, SQL, Git"
            />
          </Field>

          <Field label="Target Skills" hint="Comma-separated technologies you are aiming to master">
            <Input
              value={targetSkills}
              onChange={(e) => setTargetSkills(e.target.value)}
              placeholder="LangChain, LangGraph, RAG, PyTorch, Model Evaluation"
            />
          </Field>

          <Field label="Interests & Domain Topics" hint="Comma-separated">
            <Input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Autonomous Agents, Distributed Systems, Multi-modal LLMs"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Preferred Learning Style">
              <Input
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value)}
                placeholder="Hands-on coding, architecture deep-dives…"
              />
            </Field>
            <Field label="Daily Learning Commitment (Minutes)">
              <Input
                type="number"
                min={15}
                max={720}
                value={learningMinutes}
                onChange={(e) => setLearningMinutes(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Long-term Career Ambitions">
            <Textarea
              rows={3}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Lead AI engineering initiatives at high-growth teams and deploy real-world LLM systems..."
            />
          </Field>

          <div className="rounded-2xl bg-[#E5EEF5]/40 p-4 border border-[#B7D3E7]/40">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[#17191B]"
              />
              <span className="text-xs font-medium text-[#17191B]">
                Enable Context Memory: Allow Nexa to extract and remember factual constraints across sessions
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving Changes…" : "Save Profile →"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Security Credentials Card */}
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#666C72]">Security</span>
        <h3 className="font-display text-xl font-bold text-[#17191B]">Change Password</h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        {done && (
          <div className="rounded-2xl bg-[#C9EBC4]/30 p-3.5 border border-[#A9DE9C] text-xs font-semibold text-[#1c4722]">
            Password updated successfully.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current Password">
            <Input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••••••"
            />
          </Field>
          <Field label="New Password" hint="At least 12 characters">
            <Input
              type="password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="••••••••••••"
            />
          </Field>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" size="sm" variant="secondary" disabled={busy}>
            {busy ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
