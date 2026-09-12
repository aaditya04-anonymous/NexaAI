import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../lib/endpoints";
import { ApiError } from "../../lib/api";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That reset link didn't work. Request a new one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Paste the token from your reset email.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Reset token">
          <Input required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" />
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
        <p className="text-center text-sm text-ink-soft">
          <Link to="/login" className="hover:text-ink">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
