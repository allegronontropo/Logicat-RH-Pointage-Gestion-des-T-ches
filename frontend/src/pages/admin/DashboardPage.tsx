/**
 * src/pages/admin/DashboardPage.tsx
 * ----------------------------------
 * UXPilot-style Admin Dashboard:
 * - 12-column responsive layout (8-9 cols main content, 3-4 cols right sidebar)
 * - 6 Refined KPI Cards wired to real data from GET /api/dashboard/admin (with neutral trends —)
 * - Attendance Trends Chart with recharts (7-day placeholder with TODO comment)
 * - Recent Activity Feed (Logs) wired to real data from GET /api/attendances
 * - Right sidebar: Quick Actions & Recent Absences (real data, no fake approve/deny)
 * - Fully responsive (stacks vertically on mobile)
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  AlertCircle,
  CheckSquare,
  TrendingUp,
  Clock,
  RotateCw,
  Calendar,
} from "lucide-react";
import { getAdminDashboard } from "@/api/dashboard";
import { listAllAttendance } from "@/api/attendances";
import { useAuth } from "@/auth/useAuth";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { RecentAbsences } from "@/components/dashboard/RecentAbsences";
import { Card, CardContent } from "@/components/ui/card";
import { CreateUserModal } from "@/components/shared/CreateUserModal";
import { CreateTaskModal } from "@/components/shared/CreateTaskModal";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // 1. Fetch real KPI metrics from GET /api/dashboard/admin
  const {
    data: kpiData,
    isLoading: isKpiLoading,
    isError: isKpiError,
    refetch: refetchKpis,
    isFetching: isKpiFetching,
  } = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: getAdminDashboard,
    refetchInterval: 60_000,
  });

  // 2. Fetch real attendance list from GET /api/attendances
  const {
    data: attendancesData = [],
    isLoading: isAttendancesLoading,
    refetch: refetchAttendances,
    isFetching: isAttendancesFetching,
  } = useQuery({
    queryKey: ["attendances", "admin"],
    queryFn: () => listAllAttendance(),
    refetchInterval: 60_000,
  });

  const isRefreshing = isKpiFetching || isAttendancesFetching;

  function handleRefreshAll() {
    refetchKpis();
    refetchAttendances();
  }

  const todayStr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Mock upcoming deadlines (to be wired to real API later)
  const upcomingTasks = [
    {
      id: 1,
      title: "Réviser les grilles salariales",
      due_date: new Date().toISOString().split("T")[0],
      assignee: { first_name: "Sara", last_name: "Bennani" },
    },
    {
      id: 2,
      title: "Clôture des congés mensuels",
      due_date: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      assignee: { first_name: "Youssef", last_name: "Amrani" },
    },
    {
      id: 3,
      title: "Audit des pointages Q4",
      due_date: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      assignee: { first_name: "Kamal", last_name: "Benzarti" },
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Top Page Banner / Controls ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
              Tableau de bord RH
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {todayStr} • Connecté en tant que {user?.first_name} {user?.last_name}
          </p>
        </div>

        {/* Action button to refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner if any ──────────────────────────────── */}
      {isKpiError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-medium text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>
            Impossible de charger certaines métriques du serveur. Veuillez
            vérifier la connexion au backend API.
          </span>
        </div>
      )}

      {/* ── 12-Column Responsive Layout ───────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Left / Main Content: 8 or 9 Columns on Desktop ──── */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          {/* 6 Refined KPI Cards (Wired to Real DB Numbers, Neutral Trends) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {isKpiLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="animate-pulse border-slate-200 bg-white"
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div className="h-10 w-10 rounded-xl bg-slate-100" />
                      <div className="h-5 w-14 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-20 rounded bg-slate-100" />
                      <div className="h-8 w-16 rounded bg-slate-100" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <KpiCard
                  title="Employés Actifs"
                  value={kpiData?.active_employees ?? 0}
                  icon={Users}
                  iconBgColor="bg-blue-50"
                  iconTextColor="text-blue-600"
                  trendText="—"
                  subtitle="Comptes employés opérationnels"
                  to="/admin/users"
                />
                <KpiCard
                  title="Présents Aujourd'hui"
                  value={kpiData?.present_today ?? 0}
                  icon={UserCheck}
                  iconBgColor="bg-emerald-50"
                  iconTextColor="text-emerald-600"
                  trendText="—"
                  subtitle="Pointages enregistrés ce jour"
                  to="/admin/attendance"
                />
                <KpiCard
                  title="Absences du Jour"
                  value={kpiData?.absences_today ?? 0}
                  icon={AlertCircle}
                  iconBgColor="bg-rose-50"
                  iconTextColor="text-rose-600"
                  trendText="—"
                  subtitle="Absences justifiées ou injustifiées"
                  to="/admin/attendance"
                />
                <KpiCard
                  title="Total des Tâches"
                  value={kpiData?.total_tasks ?? 0}
                  icon={CheckSquare}
                  iconBgColor="bg-violet-50"
                  iconTextColor="text-violet-600"
                  trendText="—"
                  subtitle="Total des tâches de l'équipe"
                  to="/admin/tasks"
                />
                <KpiCard
                  title="Tâches en Cours"
                  value={kpiData?.in_progress_tasks ?? 0}
                  icon={TrendingUp}
                  iconBgColor="bg-amber-50"
                  iconTextColor="text-amber-600"
                  trendText="—"
                  subtitle="En cours d'exécution"
                  to="/admin/tasks"
                />
                <KpiCard
                  title="Tâches Terminées"
                  value={kpiData?.done_tasks ?? 0}
                  icon={Clock}
                  iconBgColor="bg-teal-50"
                  iconTextColor="text-teal-600"
                  trendText="—"
                  subtitle="Complétées avec succès"
                  to="/admin/tasks"
                />
              </>
            )}
          </div>

          {/* Attendance Trends Chart */}
          <AttendanceChart />

          {/* Recent Logs & Activity Feed (Real Attendances Data) */}
          <RecentActivityFeed
            attendances={attendancesData}
            isLoading={isAttendancesLoading}
          />
        </div>

        {/* ── Right Sidebar: 3 or 4 Columns on Desktop ────────── */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          {/* Quick Actions Panel */}
          <QuickActionsPanel
            onAddEmployee={() => setIsUserModalOpen(true)}
            onAssignTask={() => setIsTaskModalOpen(true)}
          />

          {/* Absences Récentes (Real DB Data, No Fake Approve/Deny Buttons) */}
          <RecentAbsences
            attendances={attendancesData}
            isLoading={isAttendancesLoading}
          />

          {/* Échéances à venir (Upcoming Deadlines) */}
          <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="px-4 py-3 flex items-center gap-2 border-b border-slate-100">
              <Clock className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Échéances à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-400">Aucune échéance à venir.</p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const dueDate = new Date(task.due_date!);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const isUrgent = dueDate <= tomorrow;

                  const assigneeName =
                    task.assignee
                      ? `${task.assignee.first_name} ${task.assignee.last_name}`
                      : "Non assigné";

                  return (
                    <div
                      key={task.id}
                      className="border-b border-slate-50 pb-1.5 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {task.title}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {assigneeName}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            isUrgent
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {dueDate.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Action Modals ─────────────────────────────── */}
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          await refetchKpis();
        }}
      />

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
          await refetchKpis();
        }}
      />
    </div>
  );
}
