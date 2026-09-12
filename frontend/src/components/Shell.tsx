import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_SECTIONS: Array<{ label: string; items: Array<{ to: string; label: string }> }> = [
  {
    label: "Practice",
    items: [
      { to: "/", label: "Dashboard" },
      { to: "/goals", label: "Goals & roadmap" },
      { to: "/tasks", label: "Today's tasks" },
      { to: "/learning", label: "Learning" },
    ],
  },
  {
    label: "Signal",
    items: [
      { to: "/news", label: "Career news" },
      { to: "/recommendations", label: "Recommendations" },
      { to: "/progress", label: "Progress" },
    ],
  },
  {
    label: "Memory",
    items: [
      { to: "/chat", label: "Coach chat" },
      { to: "/memories", label: "Memories" },
      { to: "/documents", label: "Documents" },
      { to: "/projects", label: "Projects" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile" },
      { to: "/settings", label: "Settings" },
    ],
  },
];

export function Shell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-64 shrink-0 flex-col border-r border-rule bg-paper-dim/50 px-5 py-6">
        <div className="mb-8 flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink font-display text-lg text-paper">N</span>
          <div>
            <p className="font-display text-lg leading-none text-ink">Nexa</p>
            <p className="text-xs text-ink-soft">Growth log</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-1 text-xs text-ink-soft/70">{section.label}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `block rounded-sm px-3 py-2 text-sm transition-colors ${
                          isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-surface hover:text-ink"
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
        </nav>

        <div className="mt-6 border-t border-rule pt-4">
          <p className="truncate px-1 text-xs text-ink-soft">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-sm px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-surface hover:text-rose"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-10 py-10">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
