import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Calendar, Users, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAttendanceTrends } from "@/api/dashboard";
import { formatDate } from "@/lib/utils";

// TODO: Replace with real aggregated data when available.

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="text-xs font-semibold text-slate-700 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-500 font-medium">Présents:</span>
              <span className="font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function AttendanceChart() {
  const [period, setPeriod] = useState<"7d">("7d");

  // Fetch real 7-day attendance trends from GET /api/dashboard/trends
  const { data: trendsData = [], isLoading } = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: getAttendanceTrends,
    refetchInterval: 60_000,
  });

  // Format real data for chart
  const formattedData = trendsData.map((item) => {
    // Parse date parts YYYY-MM-DD
    const parts = item.date.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayName = DAY_NAMES[d.getDay()] || "—";
    return {
      rawDate: item.date,
      day: `${dayName} ${parts[2]}`,
      present: item.present_count,
    };
  });

  // Calculate real summaries
  const totalPresents = trendsData.reduce((acc, curr) => acc + curr.present_count, 0);
  const dailyAvg = trendsData.length > 0 ? (totalPresents / trendsData.length).toFixed(1) : "0";
  const maxPoint = trendsData.reduce(
    (max, p) => (p.present_count > max.present_count ? p : max),
    trendsData[0] || { present_count: 0, date: "" }
  );

  const hasAnyData = totalPresents > 0;

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              Attendance Trends
            </CardTitle>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
              Live API
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique réel des présences sur les 7 derniers jours
          </p>
        </div>

        {/* Dropdown / Period Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative inline-block">
            <select
              aria-label="Sélectionner la période d'affichage"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "7d")}
              className="appearance-none rounded-lg border border-slate-200 bg-slate-50/70 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {/* Real dynamic stat highlights */}
        <div className="grid grid-cols-3 gap-2 pb-5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total pointages</p>
              <p className="text-sm font-bold text-slate-800">
                {isLoading ? "…" : `${totalPresents} présences`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Moyenne quotidienne</p>
              <p className="text-sm font-bold text-emerald-600">
                {isLoading ? "…" : `${dailyAvg} / jour`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pic de présence</p>
              <p className="text-sm font-bold text-slate-800">
                {isLoading
                  ? "…"
                  : maxPoint && maxPoint.present_count > 0
                  ? `${maxPoint.present_count} (${formatDate(maxPoint.date)})`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Chart or Empty State */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse space-y-2 text-center">
              <div className="h-4 w-28 bg-slate-100 rounded mx-auto" />
              <div className="h-32 w-full bg-slate-50 rounded" />
            </div>
          </div>
        ) : !hasAnyData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <BarChart3 className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-700">
              Aucune donnée de présence
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Les données de pointage pour les 7 derniers jours s'afficheront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  domain={[0, "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#1E40AF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-6 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1E40AF]" />
            <span>Pointages réels (GET /api/dashboard/trends)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
