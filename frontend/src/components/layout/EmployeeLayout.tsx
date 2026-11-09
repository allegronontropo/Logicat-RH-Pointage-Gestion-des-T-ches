/**
 * src/components/layout/EmployeeLayout.tsx
 * -----------------------------------------
 * Employee portal layout: compact top header + bottom navigation (mobile-first).
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, User, Clock, CheckSquare, LogOut } from "lucide-react";
import { useAuth } from "@/auth/useAuth";

const NAV_ITEMS = [
  { to: "/employee/dashboard", icon: LayoutDashboard, label: "Accueil" },
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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between bg-[#1E40AF] px-4 shadow">
        <div>
          <span className="font-semibold text-white">
            {user?.first_name} {user?.last_name}
          </span>
          <span className="ml-2 rounded-full bg-blue-300 px-2 py-0.5 text-xs font-medium text-blue-900">
            Employé
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-blue-100 hover:bg-blue-700"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="border-t border-gray-200 bg-white">
        <div className="flex">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
                  isActive
                    ? "text-[#1E40AF] font-medium"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
