import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pill-light";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";
  
  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  }[size];

  const variants: Record<string, string> = {
    primary: "bg-[#17191B] text-white hover:bg-black shadow-sm",
    secondary: "bg-[#E5EEF5] text-[#17191B] hover:bg-[#B7D3E7]/70",
    outline: "border border-[#17191B] bg-transparent text-[#17191B] hover:bg-[#17191B]/5",
    "pill-light": "bg-white text-[#17191B] border border-[#E4E7E8] hover:border-[#17191B] shadow-sm",
    ghost: "bg-transparent text-[#666C72] hover:text-[#17191B] hover:bg-black/5",
    danger: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100",
  };

  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function CircleArrow({
  direction = "up-right",
  className = "",
  onClick,
}: {
  direction?: "up-right" | "right";
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E4E7E8] bg-white text-[#17191B] shadow-sm transition-all duration-200 hover:scale-105 hover:bg-[#17191B] hover:text-white ${className}`}
    >
      {direction === "up-right" ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )}
    </button>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-2xl border border-[#E4E7E8] bg-white px-4 py-3 text-sm text-[#17191B] placeholder:text-[#666C72]/50 transition-colors focus:border-[#17191B] focus:ring-1 focus:ring-[#17191B] focus:outline-none ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-2xl border border-[#E4E7E8] bg-white px-4 py-3 text-sm text-[#17191B] placeholder:text-[#666C72]/50 transition-colors focus:border-[#17191B] focus:ring-1 focus:ring-[#17191B] focus:outline-none ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-2xl border border-[#E4E7E8] bg-white px-4 py-3 text-sm text-[#17191B] transition-colors focus:border-[#17191B] focus:ring-1 focus:ring-[#17191B] focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-wide uppercase text-[#666C72]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#666C72]/80">{hint}</span>}
    </label>
  );
}

export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`prospera-card p-6 md:p-7 ${hoverable ? "prospera-card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "mint" | "lavender" | "peach" | "dark" | "outline" | "rose" | "moss" | "brass" | "ember";
}) {
  const tones: Record<string, string> = {
    blue: "bg-[#E5EEF5] text-[#1b3b5a] border border-[#B7D3E7]/60",
    mint: "bg-[#C9EBC4] text-[#1c4722] border border-[#A9DE9C]/60",
    lavender: "bg-[#D9DDF5] text-[#2a305e] border border-[#B7D3E7]/40",
    peach: "bg-[#F4D9C6] text-[#693916] border border-[#F4D9C6]",
    dark: "bg-[#17191B] text-white",
    outline: "border border-[#17191B]/30 text-[#17191B]",
    rose: "bg-rose-50 text-rose-700 border border-rose-200",
    // Map legacy tones smoothly
    moss: "bg-[#C9EBC4] text-[#1c4722] border border-[#A9DE9C]/60",
    brass: "bg-[#E5EEF5] text-[#1b3b5a] border border-[#B7D3E7]/60",
    ember: "bg-[#F4D9C6] text-[#693916] border border-[#F4D9C6]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide ${tones[tone] || tones.blue}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="prospera-card flex flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E5EEF5] text-[#17191B]">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <p className="font-display text-xl font-bold text-[#17191B]">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-[#666C72]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-sm text-[#666C72]">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#17191B]" style={{ animationDelay: "0ms" }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#B7D3E7]" style={{ animationDelay: "150ms" }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#C9EBC4]" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-xs font-medium tracking-wider uppercase text-[#666C72]">{label}</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-800">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1 font-medium">{message}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  pillHighlight,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  pillHighlight?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#E4E7E8] pb-6 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EEF5] px-3 py-0.5 text-xs font-semibold tracking-wider uppercase text-[#1b3b5a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#17191B]" />
              {eyebrow}
            </span>
          </div>
        )}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#17191B] md:text-4xl">
          {title}
          {pillHighlight && (
            <>
              {" "}
              <span className="pill-word text-2xl md:text-3xl font-normal">{pillHighlight}</span>
            </>
          )}
        </h1>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#666C72]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EEF5]">
      <div
        className="h-full rounded-full bg-[#17191B] transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
