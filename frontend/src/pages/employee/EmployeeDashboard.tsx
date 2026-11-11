/**
 * src/pages/employee/EmployeeDashboard.tsx
 * ==========================================
 * Premium Employee Dashboard — Zero-Friction Design
 *
 * Layout (top-down, mobile-first):
 *  1. Hero Pointage Widget — full inline state machine (no redirect needed)
 *  2. Weekly Hours BarChart (Recharts, gradient fill, real attendance data)
 *  3. Task Donut Progress Rings (SVG, todo/in_progress/done)
 *  4. Top 3 Urgent Tasks list
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Utensils,
  Moon,
  ArrowRight,
  Clock,
  CheckSquare,
  Flag,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getTodayAttendance,
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getMyAttendance,
} from "@/api/attendances";
import { getEmployeeDashboard } from "@/api/dashboard";
import { getMyTasks } from "@/api/tasks";
import { useAuth } from "@/auth/useAuth";
import type { BreakSummary, Task } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtHMS(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtHM(minutes: number): string {
  const m = Math.max(0, minutes);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h ${String(m % 60).padStart(2, "0")}m`;
}

function computeWorkingSeconds(checkInStr: string, breaks: BreakSummary[], now: Date): number {
  const checkInMs = new Date(checkInStr).getTime();
  const nowMs = now.getTime();
  if (isNaN(checkInMs) || nowMs <= checkInMs) return 0;
  let breakMs = 0;
  for (const b of breaks) {
    if (b.start_time && b.end_time) {
      const s = new Date(b.start_time).getTime();
      const e = new Date(b.end_time).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) breakMs += e - s;
    }
  }
  return Math.floor(Math.max(0, nowMs - checkInMs - breakMs) / 1000);
}

function computeBreakSeconds(startStr: string, now: Date): number {
  const s = new Date(startStr).getTime();
  const n = now.getTime();
  if (isNaN(s) || n <= s) return 0;
  return Math.floor((n - s) / 1000);
}

// ─── Priority badge ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    HIGH: { label: "Élevé", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    MEDIUM: { label: "Moyen", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    LOW: { label: "Faible", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const { label, cls } = cfg[priority] ?? cfg.LOW;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      <Flag className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── SVG Donut Ring ──────────────────────────────────────────────────────────

function DonutRing({
  value, total, color, label, count,
}: { value: number; total: number; color: string; label: string; count: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold text-slate-900">{count}</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Custom Tooltip for BarChart ─────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const minutes = Math.round(payload[0].value * 60);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className="font-bold text-blue-700">{Math.floor(minutes / 60)} heures {minutes % 60} minutes</p>
    </div>
  );
}

function TimeBreakdownTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-700">{payload[0].name}</p><p className="font-bold text-slate-900">{fmtHM(payload[0].value)}</p></div>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // ── API queries ────────────────────────────────────────────────
  const { data: attendance, isLoading: loadingAtt } = useQuery({
    queryKey: ["attendances", "today"],
    queryFn: getTodayAttendance,
    refetchInterval: 60_000,
  });

  const { data: dashData } = useQuery({
    queryKey: ["dashboard", "employee"],
    queryFn: getEmployeeDashboard,
    refetchInterval: 60_000,
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ["tasks", "me"],
    queryFn: () => getMyTasks(),
    refetchInterval: 120_000,
  });

  // Last 7 days attendance for chart
  const { data: historyData = [] } = useQuery({
    queryKey: ["attendances", "history-chart"],
    queryFn: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return getMyAttendance({
        date_from: from.toISOString().split("T")[0],
        date_to: to.toISOString().split("T")[0],
      });
    },
    refetchInterval: 120_000,
  });

  // ── State machine ──────────────────────────────────────────────
  const breaks: BreakSummary[] = attendance?.breaks ?? [];
  const activeBreak = breaks.find((b) => !b.end_time);
  const isCheckedIn = !!(attendance && attendance.status !== "NOT_CHECKED_IN" && attendance.check_in);
  const isCheckedOut = !!attendance?.check_out;
  const isOnBreak = isCheckedIn && !isCheckedOut && !!activeBreak;
  const isWorking = isCheckedIn && !isCheckedOut && !activeBreak;
  const isNoRecord = !isCheckedIn;

  const takenBreakTypes = new Set(breaks.map((b) => b.type));
  const workingSecs = isWorking && attendance?.check_in
    ? computeWorkingSeconds(attendance.check_in, breaks, now)
    : 0;
  const breakSecs = isOnBreak && activeBreak?.start_time
    ? computeBreakSeconds(activeBreak.start_time, now)
    : 0;

  // ── Cache invalidation ─────────────────────────────────────────
  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ["attendances"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setActionError(null);
  }

  const onError = (msg: string) => (err: unknown) => {
    const detail = (err as { response?: { data?: { detail?: string } } })
      ?.response?.data?.detail ?? msg;
    setActionError(typeof detail === "string" ? detail : JSON.stringify(detail));
  };

  // ── Mutations ──────────────────────────────────────────────────
  const checkInMut = useMutation({ mutationFn: checkIn, onSuccess: invalidateAll, onError: onError("Erreur lors du pointage.") });
  const checkOutMut = useMutation({ mutationFn: checkOut, onSuccess: invalidateAll, onError: onError("Erreur lors du départ.") });
  const startBreakMut = useMutation({ mutationFn: (type: "MORNING" | "LUNCH" | "EVENING") => startBreak(type), onSuccess: invalidateAll, onError: onError("Erreur pause.") });
  const endBreakMut = useMutation({ mutationFn: (id: number) => endBreak(id), onSuccess: invalidateAll, onError: onError("Erreur fin de pause.") });
  const anyPending = checkInMut.isPending || checkOutMut.isPending || startBreakMut.isPending || endBreakMut.isPending;

  const breakLabel = (type?: string) =>
    type === "MORNING" ? "Matin" : type === "LUNCH" ? "Déjeuner" : type === "EVENING" ? "Soir" : (type ?? "");

  // ── Chart data (last 7 days) ───────────────────────────────────
  const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const chartData = useMemo(() => {
    const days: { day: string; hours: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const att = historyData.find((a) => a.date === key);
      days.push({
        date: key,
        day: DAY_SHORT[d.getDay()],
        hours: att ? Math.round((att.effective_minutes / 60) * 10) / 10 : 0,
      });
    }
    return days;
  }, [historyData]);

  // ── Top 3 urgent tasks ────────────────────────────────────────
  const priorityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const urgentTasks = useMemo(() =>
    [...myTasks]
      .filter((t) => t.status !== "DONE")
      .sort((a, b) => (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0))
      .slice(0, 3),
    [myTasks]
  );

  // ── Task counters ──────────────────────────────────────────────
  const todo = dashData?.todo_tasks ?? 0;
  const inProgress = dashData?.in_progress_tasks ?? 0;
  const done = dashData?.done_tasks ?? 0;
  const totalTasks = todo + inProgress + done;
  const effectiveMinutes = Math.max(0, attendance?.effective_minutes ?? 0);
  const breakMinutes = Math.max(0, attendance?.break_minutes ?? 0);
  const totalTimeMinutes = effectiveMinutes + breakMinutes;
  const timeBreakdown = [
    { name: "Travail Effectif", value: effectiveMinutes, color: "#10B981" },
    { name: "Pauses", value: breakMinutes, color: "#F59E0B" },
  ];
  const getTimePercentage = (value: number) => totalTimeMinutes > 0 ? Math.round(value / totalTimeMinutes * 100) : 0;

  // ── Pointage widget theme ──────────────────────────────────────
  const widgetTheme = isNoRecord
    ? { bg: "bg-slate-50", border: "border-slate-200", accent: "slate" }
    : isWorking
    ? { bg: "bg-emerald-50/60", border: "border-emerald-200", accent: "emerald" }
    : isOnBreak
    ? { bg: "bg-amber-50/60", border: "border-amber-200", accent: "amber" }
    : { bg: "bg-blue-50/60", border: "border-blue-200", accent: "blue" };

  const breakBtns = [
    { type: "MORNING" as const, label: "Matin", icon: <Coffee className="h-4 w-4" /> },
    { type: "LUNCH" as const, label: "Déjeuner", icon: <Utensils className="h-4 w-4" /> },
    { type: "EVENING" as const, label: "Soir", icon: <Moon className="h-4 w-4" /> },
  ];

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  return (
    <div className="space-y-5 pb-2">
      {/* ── Greeting strip ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            {greeting}, {user?.first_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700 border border-slate-200">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

      {/* ── Action error ────────────────────────────────────────── */}
      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            {actionError}
          </div>
          <button onClick={() => setActionError(null)} className="ml-3 text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
      {/* ═══════════════════════════════════════════════════════════
          HERO: POINTAGE WIDGET (State Machine)
          ═══════════════════════════════════════════════════════════ */}
      <Card className={`border-2 ${widgetTheme.border} ${widgetTheme.bg} rounded-2xl shadow-sm overflow-hidden`}>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                <Clock className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Pointage du Jour</CardTitle>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  {isNoRecord ? "Enregistrez votre arrivée" : isWorking ? "Session en cours" : isOnBreak ? "Pause active" : "Journée clôturée"}
                </p>
              </div>
            </div>
            {/* Status pill */}
            {loadingAtt ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : isWorking ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />En service
              </span>
            ) : isOnBreak ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                <Coffee className="h-3 w-3" />En pause
              </span>
            ) : isCheckedOut ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                <CheckCircle2 className="h-3 w-3" />Terminé
              </span>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          {loadingAtt ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : isNoRecord ? (
            /* ─── STATE 1: Not checked in ─── */
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white border-2 border-dashed border-slate-300 text-slate-400 shadow-inner">
                <LogIn className="h-10 w-10 stroke-[1.5]" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-bold text-slate-800">Prêt à commencer ?</p>
                <p className="text-xs text-slate-500">Pointez votre arrivée pour démarrer le compteur de présence.</p>
              </div>
              <Button
                size="lg"
                onClick={() => checkInMut.mutate()}
                disabled={anyPending}
                className="w-full max-w-xs h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 gap-2.5"
              >
                {checkInMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5 stroke-[2.5]" />}
                Pointer l'arrivée
              </Button>
            </div>
          ) : isWorking ? (
            /* ─── STATE 2: Working ─── */
            <div className="space-y-5">
              {/* Live timer */}
              <div className="rounded-2xl bg-white/80 border border-emerald-200 p-5 text-center shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-1">Temps de travail</p>
                <div className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight tabular-nums">
                  {fmtHMS(workingSecs)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Arrivée à <span className="font-bold text-slate-700">{fmtTime(attendance?.check_in)}</span>
                </p>
              </div>

              {/* Break buttons */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prendre une pause</p>
                <div className="grid grid-cols-3 gap-2">
                  {breakBtns.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => startBreakMut.mutate(type)}
                      disabled={anyPending || takenBreakTypes.has(type)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-semibold transition-all ${
                        takenBreakTypes.has(type)
                          ? "cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                          : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50 hover:border-amber-300 shadow-sm active:scale-95"
                      }`}
                    >
                      <span className={takenBreakTypes.has(type) ? "text-slate-400" : "text-amber-600"}>{icon}</span>
                      {takenBreakTypes.has(type) ? `${label} ✓` : label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-out */}
              <Button
                onClick={() => checkOutMut.mutate()}
                disabled={anyPending}
                className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 shadow-md shadow-rose-600/20"
              >
                {checkOutMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 stroke-[2.2]" />}
                Pointer le départ
              </Button>
            </div>
          ) : isOnBreak && activeBreak ? (
            /* ─── STATE 3: On break ─── */
            <div className="space-y-5">
              <div className="rounded-2xl bg-white/80 border border-amber-200 p-5 text-center shadow-inner">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mx-auto mb-3">
                  <Coffee className="h-7 w-7 stroke-[2]" />
                </div>
                <p className="text-sm font-bold text-amber-900">
                  Pause {breakLabel(activeBreak.type)}
                </p>
                <div className="text-3xl font-extrabold font-mono text-amber-800 mt-2 tabular-nums">
                  {fmtHMS(breakSecs)}
                </div>
                <p className="text-xs text-amber-700/70 mt-1.5">
                  Depuis {fmtTime(activeBreak.start_time)}
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => endBreakMut.mutate(activeBreak.id)}
                disabled={anyPending}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-600/25 gap-2.5"
              >
                {endBreakMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current stroke-2" />}
                Reprendre le travail
              </Button>

              <button
                disabled
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Pointer le départ (désactivé en pause)
              </button>
            </div>
          ) : (
            /* ─── STATE 4: Checked out ─── */
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/80 border border-blue-200 p-5 text-center shadow-inner">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mx-auto mb-3">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
                </div>
                <p className="text-xl font-extrabold text-slate-900">Journée terminée</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Vos heures ont été enregistrées. Bonne soirée !
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Arrivée", val: fmtTime(attendance?.check_in) },
                  { label: "Départ", val: fmtTime(attendance?.check_out) },
                  { label: "Effectif", val: fmtHM(attendance?.effective_minutes ?? 0) },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl bg-white border border-slate-200 p-3 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          WEEKLY HOURS BAR CHART
          ═══════════════════════════════════════════════════════════ */}
      <Card className="border border-slate-200/90 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Activité de la semaine</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Heures travaillées sur 7 jours</p>
            </div>
            <Link to="/employee/history" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Historique <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-5">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#CBD5E1" }} domain={[0, "auto"]} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, idx) => {
                    const isToday = entry.date === new Date().toISOString().split("T")[0];
                    return <Cell key={idx} fill={isToday ? "#1E40AF" : "url(#colorHours)"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      </div>
      <div className="space-y-6 lg:col-span-4">
      {/* ═══════════════════════════════════════════════════════════
          TIME BREAKDOWN
          ═══════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold text-slate-900">Répartition du jour</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">Travail effectif et pauses</p>
        </CardHeader>
        <CardContent className="p-5">
          {totalTimeMinutes === 0 ? (
            <div className="flex min-h-44 items-center justify-center px-4 text-center text-sm text-slate-400">Commencez à pointer pour voir votre répartition.</div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={timeBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={2} stroke="none">
                      {timeBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<TimeBreakdownTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {timeBreakdown.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}</span>
                    <span className="shrink-0 text-right font-semibold text-slate-800">{fmtHM(entry.value)} <span className="text-slate-400">({getTimePercentage(entry.value)}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          TASK PROGRESS RINGS + TOP 3
          ═══════════════════════════════════════════════════════════ */}
      <Card className="border border-slate-200/90 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900">Mes Tâches</CardTitle>
            </div>
            <Link to="/employee/tasks" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Toutes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Donut rings */}
          <div className="grid grid-cols-3 gap-4 pb-5 border-b border-slate-100 mb-5">
            <DonutRing value={todo} total={totalTasks} color="#94A3B8" label="À faire" count={todo} />
            <DonutRing value={inProgress} total={totalTasks} color="#2563EB" label="En cours" count={inProgress} />
            <DonutRing value={done} total={totalTasks} color="#059669" label="Terminées" count={done} />
          </div>

          {/* Top 3 urgent tasks */}
          {urgentTasks.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              <CheckSquare className="h-8 w-8 text-slate-200 mx-auto mb-2 stroke-[1.5]" />
              Aucune tâche en attente — excellent travail !
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Top priorités</p>
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTask(task)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTask(task); } }}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3 transition-colors hover:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                      task.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-slate-300"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent>
          {selectedTask && <>
            <DialogHeader><DialogTitle className="pr-7">{selectedTask.title}</DialogTitle><DialogDescription>Détails de la tâche</DialogDescription></DialogHeader>
            <div className="space-y-4 text-sm">
              <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Description</p><p className="whitespace-pre-wrap break-words text-slate-700">{selectedTask.description || "Aucune description."}</p></div>
              <div className="flex flex-wrap items-center gap-3"><PriorityBadge priority={selectedTask.priority} /><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{selectedTask.status === "DONE" ? "Terminée" : selectedTask.status === "IN_PROGRESS" ? "En cours" : "À faire"}</span><span className="text-xs text-slate-500">Échéance : {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span></div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
