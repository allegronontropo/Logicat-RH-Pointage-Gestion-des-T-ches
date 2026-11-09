/**
 * src/components/layout/AdminLayout.tsx
 * ---------------------------------------
 * Admin portal layout: dark-blue sidebar + white header + content area.
 * Uses lucide-react icons and React Router's <Outlet />.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/attendance", icon: Clock, label: "Pointages" },
  { to: "/admin/tasks", icon: CheckSquare, label: "Tâches" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#1E40AF]">
        {/* Logo / branding */}
        <div className="flex h-16 items-center gap-3 border-b border-blue-700 px-6">
          <Building2 className="h-7 w-7 text-white" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">LOGICAT</p>
            <p className="text-xs text-blue-200">Portail Admin RH</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-blue-100 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-blue-700 px-4 py-4">
          <p className="truncate text-xs font-medium text-blue-200">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="truncate text-xs text-blue-300">{user?.email}</p>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {user?.first_name} {user?.last_name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
