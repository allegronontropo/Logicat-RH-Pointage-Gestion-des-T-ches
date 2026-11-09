/**
 * src/pages/admin/DashboardPage.tsx
 * ----------------------------------
 * UXPilot-style Admin Dashboard:
 * - 12-column layout (8-9 cols main content, 3-4 cols right sidebar)
 * - 6 Refined KPI Cards with real data from GET /api/dashboard/admin
 * - Attendance Trends Chart with recharts
 * - Recent Activity Feed (Logs) with badges & avatars
 * - Right sidebar: Quick Actions & Pending Approvals
 * - Fully responsive (stacks vertically on mobile)
 */

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  AlertCircle,
  CheckSquare,
  TrendingUp,
  Clock,
  RotateCw,
  Sparkles,
  Calendar,
} from "lucide-react";
import { getAdminDashboard } from "@/api/dashboard";
import { useAuth } from "@/auth/useAuth";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    refetchInterval: 60_000,
  });

  const todayStr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Top Page Banner / Controls ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
              Tableau de bord RH
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary border border-blue-200/60">
              <Sparkles className="h-3 w-3 text-primary" />
              Vue Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {todayStr} • Bienvenue, {user?.first_name} {user?.last_name}
          </p>
        </div>

        {/* Action button to refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner if any ──────────────────────────────── */}
      {isError && (
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
          {/* 6 Refined KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
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
                  value={data?.active_employees ?? 0}
                  icon={Users}
                  iconBgColor="bg-blue-50"
                  iconTextColor="text-blue-600"
                  trend={{ value: "+4.2%", isPositive: true }}
                  subtitle="Comptes RH & staff opérationnels"
                />
                <KpiCard
                  title="Présents Aujourd'hui"
                  value={data?.present_today ?? 0}
                  icon={UserCheck}
                  iconBgColor="bg-emerald-50"
                  iconTextColor="text-emerald-600"
                  trend={{ value: "98% Taux", isPositive: true }}
                  subtitle="Check-in validé ce matin"
                />
                <KpiCard
                  title="Absences du Jour"
                  value={data?.absences_today ?? 0}
                  icon={AlertCircle}
                  iconBgColor="bg-rose-50"
                  iconTextColor="text-rose-600"
                  trend={{ value: "-12%", isPositive: true }}
                  subtitle="Absences déclarées ou congés"
                />
                <KpiCard
                  title="Total des Tâches"
                  value={data?.total_tasks ?? 0}
                  icon={CheckSquare}
                  iconBgColor="bg-violet-50"
                  iconTextColor="text-violet-600"
                  trend={{ value: "+8", isPositive: true }}
                  subtitle="Assignées dans l'organisation"
                />
                <KpiCard
                  title="Tâches en Cours"
                  value={data?.in_progress_tasks ?? 0}
                  icon={TrendingUp}
                  iconBgColor="bg-amber-50"
                  iconTextColor="text-amber-600"
                  trend={{ value: "Actif", isNeutral: true }}
                  subtitle="En phase de développement / revue"
                />
                <KpiCard
                  title="Tâches Terminées"
                  value={data?.done_tasks ?? 0}
                  icon={Clock}
                  iconBgColor="bg-teal-50"
                  iconTextColor="text-teal-600"
                  trend={{ value: "+14", isPositive: true }}
                  subtitle="Livrées avec succès"
                />
              </>
            )}
          </div>

          {/* Attendance Trends Chart */}
          <AttendanceChart />

          {/* Recent Logs & Activity Feed */}
          <RecentActivityFeed />
        </div>

        {/* ── Right Sidebar: 3 or 4 Columns on Desktop ────────── */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
          {/* Quick Actions Panel */}
          <QuickActionsPanel />

          {/* Pending Approvals Panel */}
          <PendingApprovals />

          {/* System & Compliance Mini Card */}
          <Card className="border border-slate-200/90 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Statut Plateforme
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  En ligne
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Synchronisation PostgreSQL active. Serveur UTC aligné sur le
                fuseau Casablanca.
              </p>
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/60">
                <span>FastAPI 0.3.0</span>
                <span>React 18 + Vite</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
