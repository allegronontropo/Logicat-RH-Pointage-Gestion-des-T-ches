import { Clock, Filter, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ActivityLogItem {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  action: string;
  time: string;
  badge: "ON-TIME" | "BREAK" | "LATE" | "CHECK-OUT";
}

const MOCK_ACTIVITIES: ActivityLogItem[] = [
  {
    id: "1",
    name: "Youssef Badri",
    initials: "YB",
    avatarBg: "bg-blue-600 text-white",
    role: "Développeur Fullstack",
    action: "Pointage d'arrivée (Check-in)",
    time: "08:58 AM",
    badge: "ON-TIME",
  },
  {
    id: "2",
    name: "Sara Bennani",
    initials: "SB",
    avatarBg: "bg-emerald-600 text-white",
    role: "RH & Recrutement",
    action: "Début pause déjeuner (Lunch Break)",
    time: "12:30 PM",
    badge: "BREAK",
  },
  {
    id: "3",
    name: "Karim Alami",
    initials: "KA",
    avatarBg: "bg-amber-600 text-white",
    role: "Chef de Projet",
    action: "Pointage tardif d'arrivée",
    time: "09:42 AM",
    badge: "LATE",
  },
  {
    id: "4",
    name: "Fatima Zahra",
    initials: "FZ",
    avatarBg: "bg-purple-600 text-white",
    role: "Designer UI/UX",
    action: "Fin de journée (Check-out)",
    time: "06:05 PM",
    badge: "CHECK-OUT",
  },
  {
    id: "5",
    name: "Mehdi Mansouri",
    initials: "MM",
    avatarBg: "bg-indigo-600 text-white",
    role: "DevOps Engineer",
    action: "Fin de pause café (Morning Break)",
    time: "10:45 AM",
    badge: "ON-TIME",
  },
];

const BADGE_STYLES: Record<
  ActivityLogItem["badge"],
  { label: string; className: string }
> = {
  "ON-TIME": {
    label: "À L'HEURE",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  BREAK: {
    label: "EN PAUSE",
    className: "bg-blue-50 text-blue-700 border-blue-200/80",
  },
  LATE: {
    label: "EN RETARD",
    className: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  "CHECK-OUT": {
    label: "SORTIE",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function RecentActivityFeed({
  activities = MOCK_ACTIVITIES,
}: {
  activities?: ActivityLogItem[];
}) {
  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
            Recent Logs & Activity
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Flux des pointages et actions des employés en direct
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
        {activities.map((item) => {
          const badge = BADGE_STYLES[item.badge];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/70"
            >
              {/* User Avatar & Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${item.avatarBg}`}
                >
                  {item.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <span className="hidden sm:inline-block text-xs text-slate-400">
                      • {item.role}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500 mt-0.5">
                    {item.action}
                  </p>
                </div>
              </div>

              {/* Time & Badge */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0 ml-4">
                <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-500">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {item.time}
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}

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
