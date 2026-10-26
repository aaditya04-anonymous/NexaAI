import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import { AuthLayout } from "./AuthLayout";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Password needs at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await register(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong creating your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Start your career journey" subtitle="Set your target role, generate a tailored roadmap, and log daily progress.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <ErrorNote message={error} />}
        <Field label="Email">
          <Input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" hint="At least 12 characters.">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
        <Button type="submit" className="w-full mt-2" disabled={busy}>
          {busy ? "Creating account…" : "Create account →"}
        </Button>
      </form>
      <div className="mt-8 border-t border-[#E4E7E8] pt-6 text-center text-xs text-[#666C72]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[#17191B] hover:underline">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
