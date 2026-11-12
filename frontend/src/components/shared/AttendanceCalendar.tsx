import { useMemo, useState } from "react";
import { Calendar, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Attendance, BreakSummary } from "@/types";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatHM(minutes: number): string {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

function getDayStatusColor(attendance: Attendance | undefined): string {
  if (!attendance) return "bg-slate-100";
  if (attendance.status === "PRESENT" && (attendance.effective_minutes || 0) > 0) {
    return "bg-emerald-500";
  }
  if (attendance.status === "ABSENT_JUSTIFIED") return "bg-amber-400";
  if (attendance.status === "ABSENT_UNJUSTIFIED") return "bg-rose-500";
  return "bg-slate-100";
}

function getDayStatusLabel(attendance: Attendance | undefined): string {
  if (!attendance) return "Aucun enregistrement";
  if (attendance.status === "PRESENT" && (attendance.effective_minutes || 0) > 0) {
    return `Présent · ${formatHM(attendance.effective_minutes)}`;
  }
  if (attendance.status === "ABSENT_JUSTIFIED") {
    return `Absence justifiée${attendance.justification_note ? ` · ${attendance.justification_note}` : ""}`;
  }
  if (attendance.status === "ABSENT_UNJUSTIFIED") return "Absence non justifiée";
  return "Non pointé";
}

function getBreakTypeLabel(type: string): string {
  switch (type) {
    case "MORNING": return "Pause Matin";
    case "LUNCH": return "Pause Déjeuner";
    case "EVENING": return "Pause Soir";
    default: return type;
  }
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array.from(
    { length: firstDay.getDay() },
    () => null
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

interface AttendanceCalendarProps {
  attendances: Attendance[];
  currentMonth: Date;
  isLoading?: boolean;
  onDaySelected?: (day: Date, attendance: Attendance | null) => void;
}

export function AttendanceCalendar({
  attendances,
  currentMonth,
  isLoading = false,
  onDaySelected,
}: AttendanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendances.forEach((attendance) => map.set(attendance.date, attendance));
    return map;
  }, [attendances]);

  const monthDays = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const handleDayClick = (date: Date | null) => {
    if (!date || isFuture(date)) return;
    const attendance = attendanceMap.get(getDayKey(date)) || null;
    setSelectedDay(date);
    setSelectedAttendance(attendance);
    setIsDayDialogOpen(true);
    onDaySelected?.(date, attendance);
  };

  return (
    <>
      {isLoading ? (
        <Card className="mx-auto w-full border border-slate-200/90 bg-white shadow-sm lg:max-w-5xl">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-xs font-medium text-slate-500">Chargement de l'historique...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto w-full border border-slate-200/90 bg-white shadow-sm lg:max-w-5xl">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 mb-3" id="heatmap-calendar">
              {DAYS_FR.map((day) => (
                <div key={day} className="text-center text-[11px] font-semibold uppercase text-slate-500 py-2">
                  {day}
                </div>
              ))}
              {monthDays.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                const dayKey = getDayKey(date);
                const attendance = attendanceMap.get(dayKey);
                const today = isToday(date);
                const future = isFuture(date);
                const hasData = Boolean(attendance);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleDayClick(date)}
                    disabled={future}
                    className={[
                      "relative aspect-square rounded-lg transition-all duration-150",
                      "hover:scale-105 hover:shadow-md hover:z-10",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      future ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                      today && !hasData ? "ring-2 ring-blue-600" : "",
                      today && hasData ? "ring-2 ring-blue-600 ring-offset-2" : "",
                      isWeekend(date) && !hasData ? "bg-slate-50" : "",
                      getDayStatusColor(attendance),
                      hasData ? "text-white" : "text-slate-400",
                    ].join(" ")}
                    title={getDayStatusLabel(attendance)}
                  >
                    <span className={[
                      "absolute bottom-1 right-1 text-[10px] font-bold",
                      hasData ? "text-white" : "text-slate-400",
                      today && !hasData ? "text-blue-600" : "",
                    ].join(" ")}>
                      {date.getDate()}
                    </span>
                    {today && !hasData && <span className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Légende :</span>
              <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-emerald-500" /><span className="text-[11px] text-slate-600">Présent</span></div>
              <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-amber-400" /><span className="text-[11px] text-slate-600">Absence justifiée</span></div>
              <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-rose-500" /><span className="text-[11px] text-slate-600">Absence non justifiée</span></div>
              <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-slate-100 border border-slate-200" /><span className="text-[11px] text-slate-600">Non pointé / Week-end</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Détail du {selectedDay ? selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "jour"}
            </DialogTitle>
            <DialogDescription>Timeline des pointages et pauses de la journée</DialogDescription>
          </DialogHeader>

          <div id="day-timeline-preview" className="space-y-4 pb-2">
            {selectedAttendance ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-center space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Arrivée</p>
                    <p className="text-lg font-bold font-mono text-slate-900">{formatTime(selectedAttendance.check_in)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-center space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Départ</p>
                    <p className="text-lg font-bold font-mono text-slate-900">{formatTime(selectedAttendance.check_out)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Temps effectif</p>
                    <p className="text-lg font-extrabold font-mono text-blue-900">{formatHM(selectedAttendance.effective_minutes || 0)}</p>
                  </div>
                </div>

                {selectedAttendance.breaks?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5 text-amber-600" />Pauses</h4>
                    <div className="divide-y divide-slate-100">
                      {selectedAttendance.breaks.map((breakItem: BreakSummary) => {
                        let durationText = "En cours";
                        let durationClass = "bg-amber-100 text-amber-800 animate-pulse";
                        if (breakItem.end_time) {
                          const start = new Date(breakItem.start_time).getTime();
                          const end = new Date(breakItem.end_time).getTime();
                          durationText = `${Math.max(0, Math.round((end - start) / 60000))} min`;
                          durationClass = "bg-slate-100 text-slate-700";
                        }
                        return (
                          <div key={breakItem.id} className="flex items-center justify-between py-2 text-xs">
                            <div className="flex items-center gap-2"><Coffee className="h-3.5 w-3.5 text-amber-600" /><span className="font-semibold text-slate-800">{getBreakTypeLabel(breakItem.type)}</span></div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 font-mono text-[11px]">{formatTime(breakItem.start_time)} {breakItem.end_time ? `— ${formatTime(breakItem.end_time)}` : "(en cours)"}</span>
                              <span className={`font-semibold font-mono px-2 py-0.5 rounded text-[10px] ${durationClass}`}>{durationText}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedAttendance.status === "ABSENT_JUSTIFIED" && selectedAttendance.justification_note && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs font-semibold text-amber-800">Motif de justification :</p>
                    <p className="text-xs text-amber-700 mt-1 italic">« {selectedAttendance.justification_note} »</p>
                  </div>
                )}
                {selectedAttendance.status === "ABSENT_UNJUSTIFIED" && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                    <p className="text-xs font-semibold text-rose-800">Absence non justifiée</p>
                    <p className="text-xs text-rose-700 mt-1">Aucun pointage enregistré pour cette journée.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Aucun enregistrement pour ce jour</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedDay ? (isWeekend(selectedDay) ? "Week-end" : isFuture(selectedDay) ? "Jour futur" : "Non pointé") : "—"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
