import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  children, variant = "primary", size = "md", className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-[15px]";
  const variants: Record<string, string> = {
    primary: "bg-ink text-paper hover:bg-moss-deep",
    secondary: "bg-transparent text-ink border border-ink/70 hover:border-ink hover:bg-ink/5",
    ghost: "bg-transparent text-ink-soft hover:text-ink hover:bg-surface",
    danger: "bg-transparent text-rose border border-rose/50 hover:bg-rose/10",
  };
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-moss focus:outline-none ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-moss focus:outline-none ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink focus:border-moss focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft/70">{hint}</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-rule bg-paper-dim/60 p-5 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "brass" }: { children: ReactNode; tone?: "brass" | "moss" | "ember" | "rose" }) {
  const tones: Record<string, string> = {
    brass: "bg-brass-tint text-brass",
    moss: "bg-moss-tint text-moss-deep",
    ember: "bg-ember-tint text-ember-deep",
    rose: "bg-rose/10 text-rose",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-rule px-6 py-10 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-ink-soft">
      <span className="h-3 w-3 animate-pulse rounded-full bg-brass" />
      {label}…
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-rose/40 bg-rose/5 px-4 py-3 text-sm text-rose">
      {message}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div>
        {eyebrow && <p className="mb-1 text-sm text-ember-deep">{eyebrow}</p>}
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
      <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
