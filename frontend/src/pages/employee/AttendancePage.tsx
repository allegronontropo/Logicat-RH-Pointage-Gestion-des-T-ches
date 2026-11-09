/**
 * src/pages/employee/AttendancePage.tsx
 * --------------------------------------
 * Live Pointage State Machine for the Employee Portal:
 * - State 1 (No record): Large, prominent "Pointer l'arrivée" button (Green). Calls POST /api/attendances/check-in.
 * - State 2 (Working): Live timer ("Temps de travail: 00h 00m"). 3 break buttons (Matin, Déjeuner, Soir) calling POST /api/breaks/start.
 *                      "Pointer le départ" button calling POST /api/attendances/check-out.
 * - State 3 (On Break): "En pause (Type) depuis X minutes". Prominent "Reprendre le travail" button calling POST /api/breaks/{id}/end.
 *                       Disabled Check-out button.
 * - State 4 (Checked out): "Journée terminée". Displays check-in, check-out, and total effective time. All buttons hidden.
 * - Live Timer: setInterval in useEffect updating every minute.
 * - Cache Invalidation: invalidateQueries(['attendances']) and invalidateQueries(['dashboard']) on every action.
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Timer,
  Utensils,
  Moon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTodayAttendance,
  checkIn,
  checkOut,
  startBreak,
  endBreak,
} from "@/api/attendances";
import type { BreakSummary } from "@/types";

// Helper: Format Time string (e.g. 09:05 AM or 09:05)
function formatTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper: Format hours and minutes into "00h 00m"
function formatHM(minutes: number): string {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

// Helper: Calculate live effective working minutes
function computeEffectiveWorkingMinutes(
  checkInStr: string,
  breaks: BreakSummary[],
  now: Date
): number {
  const checkInMs = new Date(checkInStr).getTime();
  const nowMs = now.getTime();
  if (isNaN(checkInMs) || nowMs <= checkInMs) return 0;

  let totalBreakMs = 0;
  for (const b of breaks) {
    if (b.start_time && b.end_time) {
      const s = new Date(b.start_time).getTime();
      const e = new Date(b.end_time).getTime();
      if (!isNaN(s) && !isNaN(e) && e > s) {
        totalBreakMs += e - s;
      }
    }
  }

  const elapsedMs = Math.max(0, nowMs - checkInMs - totalBreakMs);
  return Math.floor(elapsedMs / 60000);
}

// Helper: Calculate elapsed minutes on active break
function computeBreakElapsedMinutes(startTimeStr: string, now: Date): number {
  const startMs = new Date(startTimeStr).getTime();
  const nowMs = now.getTime();
  if (isNaN(startMs) || nowMs <= startMs) return 0;
  return Math.floor((nowMs - startMs) / 60000);
}

export default function EmployeeAttendancePage() {
  const queryClient = useQueryClient();

  // Live timer tick
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    // Tick every second to ensure exact minute updates and responsive clock
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Action error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Today's Attendance State
  const {
    data: attendance,
    isLoading,
  } = useQuery({
    queryKey: ["attendances", "today"],
    queryFn: getTodayAttendance,
  });

  // Determine state machine values
  const breaks: BreakSummary[] = attendance?.breaks || [];
  const activeBreak = breaks.find((b) => !b.end_time);

  // States:
  // State 1: No record (status NOT_CHECKED_IN or missing check_in)
  // State 4: Checked out (check_out is not null)
  // State 3: On Break (checked in, not checked out, activeBreak exists)
  // State 2: Working (checked in, not checked out, no activeBreak)
  const isCheckedIn = Boolean(
    attendance &&
      attendance.status !== "NOT_CHECKED_IN" &&
      attendance.check_in
  );
  const isCheckedOut = Boolean(attendance?.check_out);
  const isOnBreak = isCheckedIn && !isCheckedOut && Boolean(activeBreak);
  const isWorking = isCheckedIn && !isCheckedOut && !activeBreak;
  const isNoRecord = !isCheckedIn;

  // Taken break types today
  const takenBreakTypes = new Set(breaks.map((b) => b.type));

  // Live elapsed calculations
  const workingMinutes = attendance?.check_in
    ? computeEffectiveWorkingMinutes(attendance.check_in, breaks, now)
    : 0;

  const breakElapsedMinutes = activeBreak?.start_time
    ? computeBreakElapsedMinutes(activeBreak.start_time, now)
    : 0;

  // Invalidate queries helper
  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ["attendances"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  // ── Mutations ────────────────────────────────────────────────
  // Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: checkIn,
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateAll();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors du pointage de l'arrivée.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  // Check-out Mutation
  const checkOutMutation = useMutation({
    mutationFn: checkOut,
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateAll();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors du pointage du départ.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  // Start Break Mutation
  const startBreakMutation = useMutation({
    mutationFn: (type: "MORNING" | "LUNCH" | "EVENING") => startBreak(type),
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateAll();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors du début de la pause.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  // End Break Mutation
  const endBreakMutation = useMutation({
    mutationFn: (breakId: number) => endBreak(breakId),
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateAll();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la fin de la pause.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const isPending =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    startBreakMutation.isPending ||
    endBreakMutation.isPending;

  // Active Break label
  const activeBreakTypeLabel = useMemo(() => {
    if (!activeBreak) return "";
    switch (activeBreak.type) {
      case "MORNING":
        return "Matin";
      case "LUNCH":
        return "Déjeuner";
      case "EVENING":
        return "Soir";
      default:
        return activeBreak.type;
    }
  }, [activeBreak]);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const formattedTodayDate = now.toLocaleDateString("fr-FR", dateOptions);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Mon Pointage
          </h1>
          <p className="text-xs text-slate-500 capitalize mt-0.5">
            {formattedTodayDate}
          </p>
        </div>

        {/* Live Clock Display */}
        <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200/80 text-slate-700 font-mono text-xs font-semibold">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>
            {now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* ── Error Alert Banner ─────────────────────────────────── */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Central Clock Widget Card ─────────────────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Timer className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-slate-800">
                Horodateur Journalier
              </CardTitle>
            </div>

            {/* Current State Badge */}
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Chargement...
              </span>
            ) : isNoRecord ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Non pointé
              </span>
            ) : isWorking ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                En service
              </span>
            ) : isOnBreak ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                <Coffee className="h-3 w-3 text-amber-600" />
                En pause
              </span>
            ) : isCheckedOut ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                Journée terminée
              </span>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">
                Récupération de l'état du pointage...
              </p>
            </div>
          ) : isNoRecord ? (
            /* ───────────────────────────────────────────────────────────
             * STATE 1: No record (Not checked in)
             * Large, prominent "Pointer l'arrivée" button (Green).
             * ─────────────────────────────────────────────────────────── */
            <div className="flex flex-col items-center text-center py-4 space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner">
                <LogIn className="h-10 w-10 stroke-[2]" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Prêt à démarrer votre journée ?
                </h3>
                <p className="text-xs text-slate-500">
                  Enregistrez votre arrivée pour lancer le calcul de vos heures de
                  présence et accéder aux options de pause.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => checkInMutation.mutate()}
                disabled={isPending}
                className="w-full max-w-sm h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all duration-150 active:scale-[0.99] gap-2.5"
              >
                {checkInMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Pointage en cours...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 stroke-[2.5]" />
                    <span>Pointer l'arrivée</span>
                  </>
                )}
              </Button>
            </div>
          ) : isWorking ? (
            /* ───────────────────────────────────────────────────────────
             * STATE 2: Working
             * Live timer ("Temps de travail: 00h 00m").
             * 3 break buttons (Matin, Déjeuner, Soir) calling POST /api/breaks/start.
             * "Pointer le départ" button calling POST /api/attendances/check-out.
             * ─────────────────────────────────────────────────────────── */
            <div className="space-y-8 py-2">
              {/* Live Timer Display */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 rounded-2xl bg-slate-50/80 border border-slate-200/70 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Activité en cours
                </p>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                  Temps de travail: {formatHM(workingMinutes)}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Arrivée pointée à {formatTime(attendance?.check_in)}</span>
                </div>
              </div>

              {/* Breaks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Prendre une pause
                  </span>
                  <span className="text-[11px] text-slate-400">
                    1 pause par créneau / jour
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Break 1: Matin */}
                  <Button
                    variant="outline"
                    onClick={() => startBreakMutation.mutate("MORNING")}
                    disabled={isPending || takenBreakTypes.has("MORNING")}
                    className={`h-12 rounded-xl text-xs font-semibold gap-2 transition-all ${
                      takenBreakTypes.has("MORNING")
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border-slate-200 shadow-sm"
                    }`}
                  >
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span>
                      {takenBreakTypes.has("MORNING")
                        ? "Matin (Pris)"
                        : "Pause Matin"}
                    </span>
                  </Button>

                  {/* Break 2: Déjeuner */}
                  <Button
                    variant="outline"
                    onClick={() => startBreakMutation.mutate("LUNCH")}
                    disabled={isPending || takenBreakTypes.has("LUNCH")}
                    className={`h-12 rounded-xl text-xs font-semibold gap-2 transition-all ${
                      takenBreakTypes.has("LUNCH")
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border-slate-200 shadow-sm"
                    }`}
                  >
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>
                      {takenBreakTypes.has("LUNCH")
                        ? "Déjeuner (Pris)"
                        : "Pause Déjeuner"}
                    </span>
                  </Button>

                  {/* Break 3: Soir */}
                  <Button
                    variant="outline"
                    onClick={() => startBreakMutation.mutate("EVENING")}
                    disabled={isPending || takenBreakTypes.has("EVENING")}
                    className={`h-12 rounded-xl text-xs font-semibold gap-2 transition-all ${
                      takenBreakTypes.has("EVENING")
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border-slate-200 shadow-sm"
                    }`}
                  >
                    <Moon className="h-4 w-4 text-amber-600" />
                    <span>
                      {takenBreakTypes.has("EVENING")
                        ? "Soir (Pris)"
                        : "Pause Soir"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Check-out Action Button */}
              <div className="pt-2 border-t border-slate-100">
                <Button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={isPending}
                  className="w-full h-13 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 gap-2 transition-all duration-150 active:scale-[0.99]"
                >
                  {checkOutMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Validation du départ...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 stroke-[2.2]" />
                      <span>Pointer le départ</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : isOnBreak && activeBreak ? (
            /* ───────────────────────────────────────────────────────────
             * STATE 3: On Break
             * "En pause (Type) depuis X minutes".
             * Prominent "Reprendre le travail" button calling POST /api/breaks/{id}/end.
             * Disable the Check-out button.
             * ─────────────────────────────────────────────────────────── */
            <div className="space-y-8 py-2">
              {/* Break Status Display */}
              <div className="flex flex-col items-center justify-center text-center space-y-3 rounded-2xl bg-amber-50/80 border border-amber-200 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
                  <Coffee className="h-7 w-7 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-amber-950">
                    En pause ({activeBreakTypeLabel}) depuis {breakElapsedMinutes}{" "}
                    {breakElapsedMinutes <= 1 ? "minute" : "minutes"}
                  </h3>
                  <p className="text-xs text-amber-700 font-medium">
                    Pause commencée à {formatTime(activeBreak.start_time)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Prominent Resume Button */}
                <Button
                  size="lg"
                  onClick={() => endBreakMutation.mutate(activeBreak.id)}
                  disabled={isPending}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-600/25 transition-all duration-150 active:scale-[0.99] gap-2.5"
                >
                  {endBreakMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Reprise en cours...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 fill-current stroke-[2]" />
                      <span>Reprendre le travail</span>
                    </>
                  )}
                </Button>

                {/* Disabled Check-out Button */}
                <div className="pt-2">
                  <Button
                    disabled
                    variant="outline"
                    className="w-full h-12 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-xs font-semibold gap-2 opacity-60"
                    title="Veuillez terminer la pause avant de pointer le départ"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Pointer le départ (Désactivé pendant la pause)</span>
                  </Button>
                  <p className="text-[11px] text-center text-slate-400 mt-1.5 italic">
                    Le départ est bloqué tant qu'une pause est active.
                  </p>
                </div>
              </div>
            </div>
          ) : isCheckedOut ? (
            /* ───────────────────────────────────────────────────────────
             * STATE 4: Checked out
             * "Journée terminée".
             * Display check-in, check-out, and total effective time.
             * Hide all buttons.
             * ─────────────────────────────────────────────────────────── */
            <div className="space-y-6 py-4">
              {/* Checked Out Banner */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Journée terminée
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Vos heures de travail pour aujourd'hui ont été clôturées et
                  enregistrées avec succès.
                </p>
              </div>

              {/* 3 Metric Tiles (Check-in, Check-out, Total Effective Time) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tile 1: Arrivée */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-center space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Arrivée
                  </p>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {formatTime(attendance?.check_in)}
                  </p>
                </div>

                {/* Tile 2: Départ */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-center space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Départ
                  </p>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {formatTime(attendance?.check_out)}
                  </p>
                </div>

                {/* Tile 3: Total Effective Time */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                    Temps effectif
                  </p>
                  <p className="text-xl font-extrabold font-mono text-blue-900">
                    {formatHM(attendance?.effective_minutes || 0)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Today's Breaks Breakdown (if any taken) ────────────── */}
      {breaks.length > 0 && (
        <Card className="border border-slate-200/80 bg-white shadow-sm rounded-xl overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Historique des pauses du jour
            </span>
            <span className="text-[11px] text-slate-400">
              {breaks.length} {breaks.length === 1 ? "pause" : "pauses"} enregistrée(s)
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {breaks.map((b) => {
              const label =
                b.type === "MORNING"
                  ? "Pause Matin"
                  : b.type === "LUNCH"
                  ? "Pause Déjeuner"
                  : b.type === "EVENING"
                  ? "Pause Soir"
                  : b.type;

              let durationText = "En cours";
              if (b.end_time) {
                const s = new Date(b.start_time).getTime();
                const e = new Date(b.end_time).getTime();
                const mins = Math.max(0, Math.round((e - s) / 60000));
                durationText = `${mins} min`;
              }

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-semibold text-slate-800">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-[11px]">
                      {formatTime(b.start_time)}{" "}
                      {b.end_time ? `— ${formatTime(b.end_time)}` : "(en cours)"}
                    </span>
                    <span
                      className={`font-semibold font-mono px-2 py-0.5 rounded text-[10px] ${
                        b.end_time
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-800 animate-pulse"
                      }`}
                    >
                      {durationText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
