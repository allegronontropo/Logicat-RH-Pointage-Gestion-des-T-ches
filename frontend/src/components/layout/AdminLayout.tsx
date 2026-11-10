/**
 * src/components/layout/AdminLayout.tsx
 * ---------------------------------------
 * UXPilot-style Admin portal layout:
 * - Sleek dark sidebar (bg-slate-900) with refined icons & grouping
 * - Mobile responsive sidebar drawer with backdrop
 * - Top header with global search bar ("Search anything..."), notification bell with red dot
 * - User profile pill & logout button
 */

import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    title: "Menu Principal",
    items: [
      { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/tasks", icon: CheckSquare, label: "Tâches" },
    ],
  },
  {
    title: "Gestion RH",
    items: [
      { to: "/admin/users", icon: Users, label: "Utilisateurs" },
      { to: "/admin/attendance", icon: Clock, label: "Pointages & Présence" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Get current page title for breadcrumb
  const currentPath = location.pathname;
  let pageTitle = "Dashboard";
  if (currentPath.includes("/users")) pageTitle = "Gestion des Utilisateurs";
  else if (currentPath.includes("/attendance")) pageTitle = "Pointages & Présence";
  else if (currentPath.includes("/tasks")) pageTitle = "Gestion des Tâches";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/70 font-sans">
      {/* ── Mobile Sidebar Backdrop ───────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ─────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-2">
            <img src="/logo-logicat.png" alt="LOGICAT" className="h-8 w-auto" />
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-blue-900/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0 stroke-[2]" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Card in Mobile Drawer */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white">
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="mt-3 w-full gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* ── Desktop Sleek Dark Sidebar ────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-slate-900 border-r border-slate-800 select-none">
        {/* LOGICAT Brand Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <img src="/logo-logicat.png" alt="LOGICAT" className="h-8 w-auto" />
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-blue-900/40 font-semibold"
                        : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100",
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0 stroke-[2] text-slate-400 group-hover:text-slate-200" />
                  <span className="flex-1">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Card (clickable profile link) */}
        <Link
          to={`/admin/users/${user?.id}`}
          className="border-t border-slate-800/80 p-3.5 block"
        >
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-2.5 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white">
              {user?.first_name?.[0] || "A"}
              {user?.last_name?.[0] || "D"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
        </Link>
      </aside>

      {/* ── Main Container (Header + Content) ─────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ── Top Header ────────────────────────────────────────── */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="hover:text-slate-900 cursor-pointer">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold">{pageTitle}</span>
            </div>
          </div>

          {/* Right: Logout */}
          <div className="flex items-center justify-end flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5 text-xs font-semibold">
                Déconnexion
              </span>
            </Button>
          </div>
        </header>

        {/* ── Main Content Area (Scrollable) ────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
