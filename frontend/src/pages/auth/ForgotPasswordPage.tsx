import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../lib/endpoints";
import { ApiError } from "../../lib/api";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email a reset verification link if the account exists.">
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#E5EEF5] p-5 text-sm text-[#1b3b5a]">
            If that account exists, a reset email is on its way. Follow the instructions to choose a new password.
          </div>
          <Link to="/login" className="inline-block text-xs font-semibold text-[#17191B] hover:underline">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <ErrorNote message={error} />}
          <Field label="Account Email">
            <Input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link →"}
          </Button>
          <p className="text-center text-xs text-[#666C72]">
            <Link to="/login" className="font-medium text-[#17191B] hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
