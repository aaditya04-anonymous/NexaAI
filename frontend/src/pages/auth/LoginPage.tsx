import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong signing in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Pick up your career roadmap right where you left off.">
      <form onSubmit={onSubmit} className="space-y-5">
        {error && <ErrorNote message={error} />}
        <Field label="Work / Personal Email">
          <Input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
        <div className="flex items-center justify-between pt-1">
          <Link to="/forgot-password" className="text-xs font-medium text-[#666C72] hover:text-[#17191B]">
            Forgot password?
          </Link>
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </Button>
        </div>
      </form>
      <div className="mt-8 border-t border-[#E4E7E8] pt-6 text-center text-xs text-[#666C72]">
        New to Nexa?{" "}
        <Link to="/register" className="font-semibold text-[#17191B] hover:underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}
