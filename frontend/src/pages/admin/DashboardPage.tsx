/**
 * src/pages/admin/DashboardPage.tsx
 * ----------------------------------
 * Admin dashboard — KPI cards.
 */

import { useQuery } from "@tanstack/react-query";
import { Users, Clock, CheckSquare, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { getAdminDashboard } from "@/api/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-32 rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-sm text-red-700">
        Impossible de charger le tableau de bord. Vérifiez la connexion au serveur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Vue d'ensemble en temps réel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Employés actifs"
          value={data.active_employees}
          icon={Users}
          color="bg-[#1E40AF]"
          sub="Comptes actifs"
        />
        <KpiCard
          title="Présents aujourd'hui"
          value={data.present_today}
          icon={UserCheck}
          color="bg-green-600"
          sub="Ont pointé ce jour"
        />
        <KpiCard
          title="Absences aujourd'hui"
          value={data.absences_today}
          icon={AlertCircle}
          color="bg-orange-500"
          sub="Justifiées ou non"
        />
        <KpiCard
          title="Total des tâches"
          value={data.total_tasks}
          icon={CheckSquare}
          color="bg-purple-600"
        />
        <KpiCard
          title="Tâches en cours"
          value={data.in_progress_tasks}
          icon={TrendingUp}
          color="bg-yellow-500"
        />
        <KpiCard
          title="Tâches terminées"
          value={data.done_tasks}
          icon={Clock}
          color="bg-teal-600"
        />
      </div>
    </div>
  );
}
