/**
 * src/auth/ProtectedRoute.tsx
 * ---------------------------
 * Guards routes by checking:
 *   1. Token presence (redirect to /login if missing)
 *   2. Role match (redirect to /login if wrong role)
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

interface ProtectedRouteProps {
  /** If provided, only users with this role can access the route. */
  role?: "ADMIN_RH" | "EMPLOYEE";
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Redirect to the correct portal instead of /login
    if (user.role === "ADMIN_RH") return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "EMPLOYEE") return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
