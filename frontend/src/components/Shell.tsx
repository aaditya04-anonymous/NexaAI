import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS: Array<{
  category: string;
  items: Array<{ to: string; label: string; icon?: string }>;
}> = [
  {
    category: "Practice",
    items: [
      { to: "/", label: "Dashboard" },
      { to: "/goals", label: "Goals & Roadmap" },
      { to: "/tasks", label: "Daily Tasks" },
      { to: "/learning", label: "Learning Modules" },
    ],
  },
  {
    category: "Signal & Growth",
    items: [
      { to: "/news", label: "Market Intelligence" },
      { to: "/recommendations", label: "Recommendations" },
      { to: "/progress", label: "Analytics & Progress" },
    ],
  },
  {
    category: "Memory & AI",
    items: [
      { to: "/chat", label: "AI Career Coach" },
      { to: "/memories", label: "Extracted Memories" },
      { to: "/documents", label: "Knowledge Docs" },
      { to: "/projects", label: "Portfolio Projects" },
    ],
  },
  {
    category: "Account",
    items: [
      { to: "/profile", label: "Career Profile" },
      { to: "/settings", label: "Settings" },
    ],
  },
];

export function Shell() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F4F2] text-[#17191B]">
      {/* Top Editorial Prospera-inspired Header */}
      <header className="sticky top-0 z-40 border-b border-[#E4E7E8] bg-white/85 px-5 py-3.5 backdrop-blur-md md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17191B] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="font-display text-lg font-extrabold tracking-tight text-[#17191B] uppercase">
                  Nexa <span className="font-light text-[#666C72]">AI</span>
                </span>
              </div>
            </NavLink>

            {/* Provider indicator pill */}
            <span className="hidden items-center gap-1.5 rounded-full bg-[#E5EEF5] px-3 py-1 text-xs font-medium text-[#1b3b5a] sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-[#17191B] animate-pulse" />
              Groq Primary // Gemini Fallback
            </span>
          </div>

          {/* Quick links & Menu Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink
              to="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#17191B] hover:border-[#17191B] transition-all shadow-sm"
            >
              <span className="text-[#A9DE9C]">✦</span> Coach
            </NavLink>
            <NavLink
              to="/tasks"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E4E7E8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#17191B] hover:border-[#17191B] transition-all shadow-sm"
            >
              Today
            </NavLink>

            {/* User Profile Pill */}
            <div className="hidden items-center gap-2 rounded-full bg-[#E5EEF5] py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17191B] text-xs font-bold text-white uppercase">
                {user?.email?.charAt(0) || "U"}
              </span>
              <span className="max-w-[130px] truncate text-xs font-medium text-[#17191B]">
                {user?.email}
              </span>
            </div>

            {/* Mobile / Full Menu Pill (matching Prospera 'Menu' pill in top right) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 rounded-full bg-[#17191B] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-black transition-all md:hidden"
            >
              <span className="flex items-center gap-0.5">
                <span className="h-1 w-1 rounded-full bg-white" />
                <span className="h-1 w-1 rounded-full bg-white" />
                <span className="h-1 w-1 rounded-full bg-white" />
              </span>
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-8">
        {/* Desktop Sidebar (Floating White Panel with Soft Edges) */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 rounded-[26px] border border-[#E4E7E8] bg-white p-5 shadow-[0_4px_20px_-2px_rgba(23,25,27,0.03)]">
            <nav className="space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.category}>
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#666C72]">
                    {group.category}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/"}
                          className={({ isActive }) =>
                            `flex items-center justify-between rounded-full px-4 py-2 text-xs font-medium transition-all ${
                              isActive
                                ? "bg-[#17191B] text-white shadow-sm"
                                : "text-[#666C72] hover:bg-[#F3F4F2] hover:text-[#17191B]"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span>{item.label}</span>
                              {isActive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="mt-8 border-t border-[#E4E7E8] pt-4">
              <button
                onClick={logout}
                className="flex w-full items-center justify-between rounded-full px-4 py-2 text-left text-xs font-medium text-[#666C72] hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <span>Sign out</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-[#17191B]/40 backdrop-blur-xs md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute right-4 top-16 w-72 rounded-[28px] border border-[#E4E7E8] bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#E4E7E8] pb-3">
                <span className="font-display font-bold text-[#17191B]">Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full bg-[#F3F4F2] p-1.5 text-xs text-[#17191B]"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
                {NAV_GROUPS.map((group) => (
                  <div key={group.category}>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#666C72]">
                      {group.category}
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.to === "/"}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `block rounded-full px-4 py-2 text-xs font-medium ${
                                isActive ? "bg-[#17191B] text-white" : "text-[#666C72] hover:bg-[#F3F4F2]"
                              }`
                            }
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <button
                  onClick={logout}
                  className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-center text-xs font-medium text-rose-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content View */}
        <main className="min-w-0 flex-1 md:pl-8">
          <Outlet />
        </main>
      </div>

      {/* Editorial Footer Note */}
      <footer className="mt-auto border-t border-[#E4E7E8] bg-white/50 px-6 py-6 text-center text-xs text-[#666C72]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row sm:px-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-[#17191B]">Nexa AI</span>
            <span>//</span>
            <span>Personal AI Career and Growth Architecture</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#E5EEF5] px-3 py-0.5 text-[11px] font-medium text-[#1b3b5a]">
              Groq Powered
            </span>
            <span className="rounded-full bg-[#C9EBC4] px-3 py-0.5 text-[11px] font-medium text-[#1c4722]">
              Gemini Resilient
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
