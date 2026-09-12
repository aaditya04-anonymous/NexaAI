import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <div className="hidden w-[38%] flex-col justify-between bg-ink px-12 py-14 text-paper lg:flex">
        <div>
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-paper font-display text-lg text-ink">N</span>
        </div>
        <div>
          <p className="font-display text-4xl leading-tight">
            Set the goal.
            <br />
            Walk the roadmap.
            <br />
            Log the evidence.
          </p>
          <p className="mt-5 max-w-sm text-paper/60">
            Nexa turns a career target into a phased roadmap, a task for today, and a record of what you actually did.
          </p>
        </div>
        <p className="text-xs text-paper/40">Nexa Growth Agent</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <p className="font-display text-2xl text-ink">{title}</p>
          <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
