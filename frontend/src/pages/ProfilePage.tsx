import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { changePassword, updateCareerProfile } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from "../components/ui";
import { PageHeader } from "../components/ui";

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

  useEffect(() => { setSaved(false); }, [name, profession, currentRole, experienceLevel, currentSkills, targetSkills, interests, learningStyle, learningMinutes, objectives, memoryEnabled]);

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
    <div>
      <PageHeader eyebrow="Account" title="Profile" description="This context shapes your roadmap, tasks, and recommendations." />
      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <ErrorNote message={error} />}
          {saved && <p className="text-sm text-moss-deep">Saved.</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Current profession"><Input value={profession} onChange={(e) => setProfession(e.target.value)} /></Field>
            <Field label="Current role"><Input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} /></Field>
            <Field label="Experience level">
              <Select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option value="">Not set</option>
                <option value="entry">Entry</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </Select>
            </Field>
          </div>

          <Field label="Current skills" hint="Comma separated"><Input value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} /></Field>
          <Field label="Target skills" hint="Comma separated"><Input value={targetSkills} onChange={(e) => setTargetSkills(e.target.value)} /></Field>
          <Field label="Interests" hint="Comma separated"><Input value={interests} onChange={(e) => setInterests(e.target.value)} /></Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred learning style"><Input value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)} placeholder="hands-on, video, reading…" /></Field>
            <Field label="Daily learning minutes"><Input type="number" min={15} max={720} value={learningMinutes} onChange={(e) => setLearningMinutes(Number(e.target.value))} /></Field>
          </div>

          <Field label="Career objectives"><Textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} /></Field>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={memoryEnabled} onChange={(e) => setMemoryEnabled(e.target.checked)} />
            Allow Nexa to remember facts about me across conversations
          </label>

          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </form>
      </Card>

      <div className="mt-8">
        <PasswordCard />
      </div>
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
      <p className="mb-3 font-display text-lg text-ink">Change password</p>
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <ErrorNote message={error} />}
        {done && <p className="text-sm text-moss-deep">Password updated.</p>}
        <Field label="Current password"><Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint="At least 12 characters"><Input type="password" required value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
      </form>
    </Card>
  );
}
