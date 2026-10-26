import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F3F4F2] p-4 md:p-8 items-center justify-center">
      <div className="flex w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#E4E7E8] bg-white shadow-[0_12px_40px_-6px_rgba(23,25,27,0.06)] flex-col lg:flex-row">
        
        {/* Left Side: Editorial Prospera-inspired Showcase Panel */}
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#E5EEF5] via-[#F3F4F2] to-[#D9DDF5] p-8 md:p-12 lg:w-1/2">
          {/* Brand header */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17191B] text-white font-bold text-sm shadow-sm">
                ✦
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-[#17191B] uppercase">
                Nexa
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#17191B] shadow-xs">
                AI Career Agent
              </span>
            </div>
          </div>

          {/* Hero Editorial Typography with Outlined Pill Words */}
          <div className="my-10 space-y-6">
            <h2 className="font-display text-4xl font-extrabold leading-[1.25] tracking-tight text-[#17191B] sm:text-5xl">
              <span className="pill-word">Discover.</span>{" "}
              <span className="pill-word">Plan.</span>
              <br />
              <span className="pill-word-mint">Develop.</span> Together.
            </h2>

            <div className="space-y-2 text-sm text-[#666C72]">
              <p className="flex items-center gap-2 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#17191B]" />
                Personal AI growth agent powered by Groq & Gemini
              </p>
              <p className="flex items-center gap-2 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A9DE9C]" />
                Phased roadmaps, verified evidence & daily micro-actions
              </p>
            </div>

            {/* Prospera Speech Bubble preview */}
            <div className="relative mt-8 max-w-sm rounded-3xl bg-white p-5 shadow-sm border border-white/60">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9EBC4] text-sm font-bold text-[#1c4722]">
                  🌿
                </div>
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed text-[#17191B]">
                    "I want to transition into an AI Engineer role with hands-on RAG and LLM systems."
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E5EEF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#1b3b5a]">
                      ● Roadmap Generated
                    </span>
                    <span className="text-[11px] text-[#666C72]">today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E4E7E8]/70">
            <span className="text-xs font-medium text-[#666C72]">
              Collaboration can change your trajectory //
            </span>
            <div className="flex -space-x-1.5 overflow-hidden">
              <span className="inline-block h-6 w-6 rounded-full bg-[#B7D3E7] ring-2 ring-white" />
              <span className="inline-block h-6 w-6 rounded-full bg-[#C9EBC4] ring-2 ring-white" />
              <span className="inline-block h-6 w-6 rounded-full bg-[#D9DDF5] ring-2 ring-white" />
            </div>
          </div>
        </div>

        {/* Right Side: Clean Form Container */}
        <div className="flex flex-1 flex-col justify-center bg-white p-8 md:p-14 lg:w-1/2">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <span className="mb-2 inline-block rounded-full bg-[#E5EEF5] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1b3b5a]">
                Authentication
              </span>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#17191B]">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#666C72]">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
