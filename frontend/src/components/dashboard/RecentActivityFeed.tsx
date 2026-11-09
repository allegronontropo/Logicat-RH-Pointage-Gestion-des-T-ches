import { Clock, Filter, ArrowUpRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { Attendance } from "@/types";

interface RecentActivityFeedProps {
  attendances?: Attendance[];
  isLoading?: boolean;
}

export function RecentActivityFeed({
  attendances = [],
  isLoading = false,
}: RecentActivityFeedProps) {
  // Take up to 5 most recent records
  const recentAttendances = attendances.slice(0, 5);

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
            Recent Logs & Activity
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Flux des pointages et présences en direct (Base de données réelle)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            Filtrer
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                    <div className="h-2.5 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentAttendances.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-2">
              <Activity className="h-5 w-5 stroke-[1.8]" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Aucune activité aujourd'hui
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto">
              Les pointages et présences apparaîtront ici dès que les employés débuteront leur journée.
            </p>
          </div>
        ) : (
          recentAttendances.map((item) => {
            const employeeName =
              item.employee_name ||
              (item.employee
                ? `${item.employee.first_name} ${item.employee.last_name}`
                : `Employé #${item.employee_id}`);

            const employeeRole =
              item.employee?.position ||
              item.employee?.department ||
              "Collaborateur";

            const initials = employeeName
              .split(" ")
              .filter(Boolean)
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "EM";

            // Determine status, action & badge
            const activeBreak = item.breaks?.find(
              (b) => b.start_time && !b.end_time
            );

            let statusLabel = "Présent";
            let actionText = "Arrivée pointée (Check-in)";
            let timeText = item.check_in ? formatDateTime(item.check_in) : formatDate(item.date);
            let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
            let avatarBg = "bg-blue-600 text-white";

            if (activeBreak) {
              const breakTypeLabel =
                activeBreak.type === "MORNING"
                  ? "Matin"
                  : activeBreak.type === "LUNCH"
                  ? "Déjeuner"
                  : "Après-midi";
              statusLabel = "EN PAUSE";
              actionText = `En pause (${breakTypeLabel})`;
              timeText = formatDateTime(activeBreak.start_time);
              badgeClass = "bg-blue-50 text-blue-700 border-blue-200/80";
              avatarBg = "bg-amber-600 text-white";
            } else if (item.check_out) {
              statusLabel = "SORTIE";
              actionText = "Journée terminée (Check-out)";
              timeText = formatDateTime(item.check_out);
              badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
              avatarBg = "bg-slate-600 text-white";
            } else if (item.check_in) {
              statusLabel = "PRÉSENT";
              actionText = `Arrivée pointée à ${formatDateTime(item.check_in)}`;
              timeText = formatDateTime(item.check_in);
              badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
              avatarBg = "bg-emerald-600 text-white";
            } else if (item.status === "ABSENT_JUSTIFIED") {
              statusLabel = "JUSTIFIÉE";
              actionText = `Absence: ${item.justification_note || "Justifiée"}`;
              timeText = formatDate(item.date);
              badgeClass = "bg-amber-50 text-amber-700 border-amber-200/80";
              avatarBg = "bg-amber-500 text-white";
            } else if (item.status === "ABSENT_UNJUSTIFIED") {
              statusLabel = "INJUSTIFIÉE";
              actionText = "Absence non justifiée déclarée";
              timeText = formatDate(item.date);
              badgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";
              avatarBg = "bg-rose-600 text-white";
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/70"
              >
                {/* User Avatar & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${avatarBg}`}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {employeeName}
                      </p>
                      <span className="hidden sm:inline-block text-xs text-slate-400">
                        • {employeeRole}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {actionText}
                    </p>
                  </div>
                </div>

                {/* Time & Badge */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-500">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {timeText}
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${badgeClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* View all footer link */}
        <div className="p-3 text-center bg-slate-50/50">
          <a
            href="/admin/attendance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition"
          >
            Consulter l'historique complet des pointages
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
