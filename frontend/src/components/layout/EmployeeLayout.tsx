/**
 * src/components/layout/EmployeeLayout.tsx
 * -----------------------------------------
 * Employee portal mobile-first layout:
 * - Top Header: LOGICAT logo, "Espace Employé", User Name, Logout button.
 * - Main content: <Outlet /> wrapped with p-4 pb-20.
 * - Bottom Navigation: Fixed bottom bar on mobile with Lucide icons (Dashboard, Pointage, Tâches, Profil).
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  User,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";

const NAV_ITEMS = [
  { to: "/employee/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/employee/attendance", icon: Clock, label: "Pointage" },
  { to: "/employee/tasks", icon: CheckSquare, label: "Tâches" },
  { to: "/employee/profile", icon: User, label: "Profil" },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : "EM";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-blue-900/30 bg-[#1E40AF] px-4 shadow-sm sm:px-6">
        {/* Left: LOGICAT Logo + "Espace Employé" */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-sm">
            <Building2 className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                LOGICAT
              </span>
              <span className="rounded-full bg-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-100 border border-blue-400/30">
                Espace Employé
              </span>
            </div>
          </div>
        </div>

        {/* Right: User Name + Logout Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-bold text-xs text-white border border-blue-300/40 shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-[10px] text-blue-200 leading-tight">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-700/50 px-2.5 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Area (Scrollable with p-4 pb-20) ──────── */}
      <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-24">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Navigation Bar (Fixed to bottom) ───────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-2xl">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-all duration-150",
                  isActive
                    ? "text-blue-700 font-bold"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-10 rounded-full bg-blue-600" />
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "group-hover:bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "stroke-[2.5]" : "stroke-[1.8]"
                      }`}
                    />
                  </div>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
