import { useEffect, useState, type FormEvent } from "react";
import { checkHealth } from "../lib/api";
import { getApiBase, setApiBase } from "../lib/config";
import { getNotificationPreferences, updateNotificationPreferences } from "../lib/endpoints";
import { ApiError } from "../lib/api";
import type { NotificationPreferences } from "../lib/types";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader } from "../components/ui";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [status, setStatus] = useState<"unknown" | "ok" | "down">("unknown");
  const [checking, setChecking] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch((err) => setPrefsError(err instanceof ApiError ? err.message : "Couldn't load preferences."));
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Platform & System"
        pillHighlight="Settings"
        description="API connection endpoint, AI provider runtime status, and delivery notifications."
      />

      {/* AI Provider Runtime Status Banner */}
      <Card className="bg-gradient-to-r from-[#E5EEF5]/70 via-white to-[#C9EBC4]/40 border-[#E4E7E8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#17191B] animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1b3b5a]">
                AI Orchestration Architecture
              </span>
            </div>
            <p className="font-display text-xl font-bold text-[#17191B]">
              Primary: Groq (Llama 3.3) • Resilient Fallback: Google Gemini
            </p>
            <p className="text-xs text-[#666C72]">
              Groq handles real-time generation. In the event of network disruption or rate-limits, Gemini acts as automatic fallback.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17191B] border border-[#E4E7E8] shadow-xs">
              ⚡ Ultra-Low Latency
            </span>
          </div>
        </div>
      </Card>

      {/* Backend API Connection */}
      <Card>
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Infrastructure</span>
          <h2 className="font-display text-xl font-bold text-[#17191B]">Backend REST API</h2>
        </div>

        <form onSubmit={onSaveUrl} className="space-y-4">
          <Field label="API Base URL" hint="Origin host for Nexa Fast API backend">
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm">
              Save & Reload
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onCheck} disabled={checking}>
              {checking ? "Probing Health…" : "Probe API Health"}
            </Button>
            {status === "ok" && (
              <Badge tone="mint">Online & Healthy ✓</Badge>
            )}
            {status === "down" && (
              <Badge tone="peach">Service Unreachable</Badge>
            )}
          </div>
        </form>
      </Card>

      {/* Notifications Preferences */}
      <Card>
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">Preferences</span>
          <h2 className="font-display text-xl font-bold text-[#17191B]">Practice Reminders</h2>
        </div>

        {prefsError && <ErrorNote message={prefsError} />}

        {!prefs ? (
          <p className="text-xs text-[#666C72]">Loading notification preferences…</p>
        ) : (
          <form onSubmit={onSavePrefs} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["enabled", "task_reminders", "learning_reminders", "article_reminders"] as const).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E4E7E8] p-3 text-xs font-medium text-[#17191B] hover:bg-[#F3F4F2] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                    className="accent-[#17191B] h-4 w-4 rounded"
                  />
                  <span className="capitalize">{key.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>

            <Field label="Preferred Notification Timezone">
              <Input
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                placeholder="UTC"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={savingPrefs}>
                {savingPrefs ? "Saving…" : "Save Preferences"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
