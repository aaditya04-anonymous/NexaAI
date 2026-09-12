import { useEffect, useState, type FormEvent } from "react";
import { checkHealth } from "../lib/api";
import { getApiBase, setApiBase } from "../lib/config";
import { getNotificationPreferences, updateNotificationPreferences } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { NotificationPreferences } from "../lib/types";
import { Button, Card, ErrorNote, Field, Input, PageHeader } from "../components/ui";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [status, setStatus] = useState<"unknown" | "ok" | "down">("unknown");
  const [checking, setChecking] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    getNotificationPreferences().then(setPrefs).catch((err) => setPrefsError(err instanceof ApiError ? err.message : "Couldn't load preferences."));
  }, []);

  async function onCheck() {
    setChecking(true);
    const ok = await checkHealth();
    setStatus(ok ? "ok" : "down");
    setChecking(false);
  }

  function onSaveUrl(e: FormEvent) {
    e.preventDefault();
    setApiBase(apiUrl);
    setStatus("unknown");
    window.location.reload();
  }

  async function onSavePrefs(e: FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setSavingPrefs(true);
    setPrefsError(null);
    try {
      setPrefs(await updateNotificationPreferences(prefs));
    } catch (err) {
      setPrefsError(err instanceof ApiError ? err.message : "Couldn't save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Connection and notification preferences." />

      <Card className="mb-8">
        <p className="mb-3 font-display text-lg text-ink">Backend connection</p>
        <form onSubmit={onSaveUrl} className="space-y-3">
          <Field label="API base URL" hint="Where your NexaAI backend is running">
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://localhost:8000" />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">Save & reload</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onCheck} disabled={checking}>
              {checking ? "Checking…" : "Check connection"}
            </Button>
            {status === "ok" && <span className="text-sm text-moss-deep">Connected</span>}
            {status === "down" && <span className="text-sm text-rose">Not reachable</span>}
          </div>
        </form>
      </Card>

      <Card>
        <p className="mb-3 font-display text-lg text-ink">Notifications</p>
        {prefsError && <div className="mb-3"><ErrorNote message={prefsError} /></div>}
        {!prefs ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <form onSubmit={onSavePrefs} className="space-y-3">
            {(["enabled", "task_reminders", "learning_reminders", "article_reminders"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                />
                {key.replace(/_/g, " ")}
              </label>
            ))}
            <Field label="Timezone">
              <Input value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })} />
            </Field>
            <Button type="submit" size="sm" disabled={savingPrefs}>{savingPrefs ? "Saving…" : "Save preferences"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
