import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Calendar, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: Replace with real aggregated data when available.
const MOCK_DATA_7_DAYS = [
  { day: "Lun", date: "03 Nov", present: 18, remote: 2, absent: 1, rate: 95 },
  { day: "Mar", date: "04 Nov", present: 19, remote: 1, absent: 0, rate: 100 },
  { day: "Mer", date: "05 Nov", present: 17, remote: 2, absent: 1, rate: 90 },
  { day: "Jeu", date: "06 Nov", present: 20, remote: 0, absent: 0, rate: 100 },
  { day: "Ven", date: "07 Nov", present: 18, remote: 1, absent: 1, rate: 95 },
  { day: "Sam", date: "08 Nov", present: 6, remote: 0, absent: 0, rate: 100 },
  { day: "Dim", date: "09 Nov", present: 19, remote: 1, absent: 0, rate: 98 },
];

const MOCK_DATA_30_DAYS = [
  { day: "S1", date: "Semaine 1", present: 94, remote: 8, absent: 3, rate: 96 },
  { day: "S2", date: "Semaine 2", present: 98, remote: 6, absent: 1, rate: 99 },
  { day: "S3", date: "Semaine 3", present: 91, remote: 10, absent: 4, rate: 92 },
  { day: "S4", date: "Semaine 4", present: 97, remote: 7, absent: 2, rate: 98 },
];

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
              <span className="text-slate-500 font-medium capitalize">
                {entry.name === "present" ? "Présents au bureau" : "En télétravail"}:
              </span>
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
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const data = period === "7d" ? MOCK_DATA_7_DAYS : MOCK_DATA_30_DAYS;

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              Attendance Trends
            </CardTitle>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi quotidien des présences et répartition du temps de travail
          </p>
        </div>

        {/* Dropdown / Period Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative inline-block">
            <select
              aria-label="Sélectionner la période d'affichage"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "7d" | "30d")}
              className="appearance-none rounded-lg border border-slate-200 bg-slate-50/70 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {/* Quick stat highlights */}
        <div className="grid grid-cols-3 gap-2 pb-5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Moyenne quotidienne</p>
              <p className="text-sm font-bold text-slate-800">18.4 employés</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Taux de présence</p>
              <p className="text-sm font-bold text-emerald-600">96.8%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Pic de présence</p>
              <p className="text-sm font-bold text-slate-800">Jeudi (20/20)</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorRemote" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
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
              <Area
                type="monotone"
                dataKey="remote"
                stroke="#38BDF8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRemote)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-6 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1E40AF]" />
            <span>Présents au bureau</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8]" />
            <span>Télétravail / En déplacement</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
