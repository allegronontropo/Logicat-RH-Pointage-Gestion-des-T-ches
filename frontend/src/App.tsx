import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/components/layout/AdminLayout";
import EmployeeLayout from "@/components/layout/EmployeeLayout";
import AdminDashboardPage from "@/pages/admin/DashboardPage";
import UsersPage from "@/pages/admin/UsersPage";
import UserDetailPage from "@/pages/admin/UserDetailPage";
import AdminUserHistoryPage from "@/pages/admin/AdminUserHistory";
import AttendancePage from "@/pages/admin/AttendancePage";
import TasksPage from "@/pages/admin/TasksPage";
import EmployeeDashboardPage from "@/pages/employee/DashboardPage";
import EmployeeAttendancePage from "@/pages/employee/AttendancePage";
import EmployeeHistoryPage from "@/pages/employee/EmployeeHistory";
import EmployeeTasksPage from "@/pages/employee/TasksPage";
import EmployeeProfilePage from "@/pages/employee/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Portal */}
            <Route element={<ProtectedRoute role="ADMIN_RH" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/:id/history" element={<AdminUserHistoryPage />} />
                <Route path="users/:id" element={<UserDetailPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="tasks" element={<TasksPage />} />
              </Route>
            </Route>

            {/* Employee Portal */}
            <Route element={<ProtectedRoute role="EMPLOYEE" />}>
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<Navigate to="/employee/dashboard" replace />} />
                <Route path="dashboard" element={<EmployeeDashboardPage />} />
                <Route path="attendance" element={<EmployeeAttendancePage />} />
                <Route path="history" element={<EmployeeHistoryPage />} />
                <Route path="tasks" element={<EmployeeTasksPage />} />
                <Route path="profile" element={<EmployeeProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
