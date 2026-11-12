import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttendanceCalendar } from "@/components/shared/AttendanceCalendar";
import { getMyAttendance } from "@/api/attendances";
import type { Attendance } from "@/types";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDayOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array.from({ length: firstDayOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (hours && remainder) return `${hours} h ${remainder} min`;
  if (hours) return `${hours} h`;
  return `${remainder} min`;
}

const BREAK_TYPES = [
  { type: "MORNING", label: "Matin" },
  { type: "LUNCH", label: "Déjeuner" },
  { type: "EVENING", label: "Soir" },
] as const;

function getBreakMinutes(
  startTime: string,
  endTime: string | null,
): number {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 60_000);
}

function getLateMinutes(attendance: Attendance): number | null {
  const value = (attendance as Attendance & { late_minutes?: number | null }).late_minutes;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
}

async function capturePdfElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(document.documentElement.clientWidth, 840),
    windowHeight: Math.max(document.documentElement.clientHeight, element.scrollHeight + 40),
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDocument) => {
      const clone = clonedDocument.getElementById(element.id);
      if (!clone) return;
      // Keep the production node off-screen; only the html2canvas clone is moved
      // into the viewport so its full width is rendered instead of being clipped.
      clone.style.position = "fixed";
      clone.style.left = "0px";
      clone.style.top = "0px";
      clone.style.right = "auto";
      clone.style.zIndex = "999999";
    },
  });
}

function addCanvasToA4Page(pdf: jsPDF, canvas: HTMLCanvasElement, addPage = false) {
  if (addPage) pdf.addPage("a4", "portrait");
  const margin = 32;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  const x = (pageWidth - width) / 2;
  const y = margin + (availableHeight - height) / 2;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height);
}

export default function EmployeeHistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [exportDate, setExportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState<"month" | "day" | null>(null);

  const monthKey = getMonthKey(currentMonth);
  const monthEndDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  const { data: attendances = [], isLoading } = useQuery({
    queryKey: ["attendances", "history", monthKey],
    queryFn: () => getMyAttendance({
      date_from: `${monthKey}-01`,
      date_to: `${monthKey}-${String(monthEndDay).padStart(2, "0")}`,
    }),
  });

  const {
    data: exportDateAttendances = [],
    isLoading: isExportDateLoading,
  } = useQuery({
    queryKey: ["attendances", "history-export", exportDate],
    queryFn: () => getMyAttendance({ date_from: exportDate, date_to: exportDate }),
    enabled: Boolean(exportDate),
  });

  const exportAttendance = useMemo(
    () => exportDateAttendances.find((attendance) => attendance.date === exportDate)
      ?? attendances.find((attendance) => attendance.date === exportDate)
      ?? null,
    [attendances, exportDate, exportDateAttendances],
  );
  const monthDays = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth],
  );
  const attendanceByDate = useMemo(
    () => new Map(attendances.map((attendance) => [attendance.date, attendance])),
    [attendances],
  );
  const exportLateMinutes = exportAttendance ? getLateMinutes(exportAttendance) : null;
  const monthTotals = useMemo(
    () => attendances.reduce(
      (totals, attendance) => ({
        presence: totals.presence + (attendance.presence_minutes || 0),
        breaks: totals.breaks + (attendance.break_minutes || 0),
        effective: totals.effective + (attendance.effective_minutes || 0),
      }),
      { presence: 0, breaks: 0, effective: 0 },
    ),
    [attendances],
  );

  const handleExportMonth = async () => {
    setIsExporting("month");
    try {
      const calendarElement = document.getElementById("month-report-export");
      const detailsElement = document.getElementById("month-details-export");
      if (!calendarElement || !detailsElement) return;
      const [calendarCanvas, detailsCanvas] = await Promise.all([
        capturePdfElement(calendarElement),
        capturePdfElement(detailsElement),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      addCanvasToA4Page(pdf, calendarCanvas);
      addCanvasToA4Page(pdf, detailsCanvas, true);
      pdf.save(`historique-${monthKey}.pdf`);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportDay = async () => {
    if (!exportDate || isExportDateLoading) return;
    if (!exportAttendance) {
      window.alert("Aucun pointage trouvé pour cette date");
      return;
    }
    setIsExporting("day");
    try {
      const element = document.getElementById("day-timeline-export");
      if (!element) return;
      const canvas = await capturePdfElement(element);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      addCanvasToA4Page(pdf, canvas);
      pdf.save(`pointage-${exportDate}.pdf`);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Historique des Pointages</h1>
          <p className="text-xs text-slate-500 mt-0.5">Visualisez votre présence mensuelle et exportez vos rapports</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(prevMonth)} className="gap-1.5">
            <ChevronLeft className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mois précédent</span>
          </Button>
          <span className="text-sm font-bold text-slate-800 px-3">{MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(nextMonth)} className="gap-1.5">
            <span className="hidden sm:inline">Mois suivant</span><ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMonth} disabled={isExporting === "month" || isLoading} className="gap-1.5 ml-2">
            {isExporting === "month" ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /><span>Export...</span></> : <><Download className="h-3.5 w-3.5" /><span>Exporter le mois</span></>}
          </Button>
          <Input
            type="date"
            aria-label="Date du pointage à exporter"
            value={exportDate}
            onChange={(event) => setExportDate(event.target.value)}
            className="h-9 w-auto min-w-[150px]"
          />
          <Button variant="outline" size="sm" onClick={handleExportDay} disabled={isExporting === "day" || isExportDateLoading || !exportDate} className="gap-1.5">
            {isExporting === "day" ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /><span>Export...</span></> : <><Download className="h-3.5 w-3.5" /><span>Exporter la journée</span></>}
          </Button>
        </div>
      </div>

      <AttendanceCalendar
        attendances={attendances}
        currentMonth={currentMonth}
        isLoading={isLoading}
        onDaySelected={(day) => {
          setExportDate(getDayKey(day));
        }}
      />

      <div
        id="month-report-export"
        style={{ position: "fixed", left: "-9999px", top: 0, backgroundColor: "#ffffff", padding: "40px", width: "800px", zIndex: -1 }}
        aria-hidden="true"
      >
        <h1 style={{ color: "#0f172a", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          Historique des pointages
        </h1>
        <p style={{ color: "#475569", fontSize: 14, margin: "0 0 24px" }}>
          {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
          {[
            { label: "Jours enregistrés", value: `${attendances.length}`, color: "#334155", background: "#f8fafc" },
            { label: "Présence", value: formatMinutes(monthTotals.presence), color: "#0369a1", background: "#f0f9ff" },
            { label: "Pauses", value: formatMinutes(monthTotals.breaks), color: "#b45309", background: "#fffbeb" },
            { label: "Temps effectif", value: formatMinutes(monthTotals.effective), color: "#047857", background: "#ecfdf5" },
          ].map((item) => (
            <div key={item.label} style={{ backgroundColor: item.background, border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 12px" }}>
              <p style={{ color: "#64748b", fontSize: 9, fontWeight: 700, margin: "0 0 5px", textTransform: "uppercase" }}>{item.label}</p>
              <p style={{ color: item.color, fontSize: 13, fontWeight: 800, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => (
            <div key={day} style={{ color: "#475569", fontSize: 12, fontWeight: 700, textAlign: "center", padding: "8px 0" }}>
              {day}
            </div>
          ))}
          {monthDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} style={{ height: 76 }} />;
            const dayKey = getDayKey(day);
            const attendance = attendanceByDate.get(dayKey);
            const isPresent = attendance?.status === "PRESENT" && (attendance.effective_minutes || 0) > 0;
            const isJustified = attendance?.status === "ABSENT_JUSTIFIED";
            const isUnjustified = attendance?.status === "ABSENT_UNJUSTIFIED";
            const backgroundColor = isPresent
              ? "#10b981"
              : isJustified
                ? "#f59e0b"
                : isUnjustified
                  ? "#ef4444"
                  : "#f1f5f9";
            const color = isPresent || isJustified || isUnjustified ? "#ffffff" : "#64748b";
            return (
              <div
                key={dayKey}
                style={{
                  height: 76,
                  borderRadius: 10,
                  backgroundColor,
                  color,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span>{day.getDate()}</span>
                {attendance && <span style={{ fontSize: 9, marginTop: 3 }}>{isPresent ? "Présent" : isJustified ? "Justifié" : isUnjustified ? "Absent" : "Pointage"}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 24, color: "#334155", fontSize: 11 }}>
          {[ ["#10b981", "Présent"], ["#f59e0b", "Absence justifiée"], ["#ef4444", "Absence non justifiée"], ["#f1f5f9", "Aucun pointage"] ].map(([color, label]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, backgroundColor: color, border: "1px solid #cbd5e1" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div
        id="month-details-export"
        style={{ position: "fixed", left: "-9999px", top: 0, backgroundColor: "#ffffff", padding: "40px", width: "800px", zIndex: -1 }}
        aria-hidden="true"
      >
        <h1 style={{ color: "#0f172a", fontSize: 23, fontWeight: 800, margin: "0 0 6px" }}>
          Détail des pointages du mois
        </h1>
        <p style={{ color: "#475569", fontSize: 13, margin: "0 0 18px" }}>
          {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()} · {attendances.length} journée(s) enregistrée(s)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Présence totale", value: formatMinutes(monthTotals.presence) },
            { label: "Pauses totales", value: formatMinutes(monthTotals.breaks) },
            { label: "Temps effectif total", value: formatMinutes(monthTotals.effective) },
          ].map((item) => (
            <div key={item.label} style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <p style={{ color: "#64748b", fontSize: 9, fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" }}>{item.label}</p>
              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#1e293b", fontSize: 10 }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
              {["Date", "Statut", "Arrivée", "Départ", "Présence", "Pauses", "Effectif"].map((heading) => (
                <th key={heading} style={{ padding: "8px 6px", border: "1px solid #cbd5e1", textAlign: "left", whiteSpace: "nowrap" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendances.length > 0 ? attendances.map((attendance) => {
              const dayDate = new Date(`${attendance.date}T00:00:00`);
              const statusLabel = attendance.status === "PRESENT"
                ? "Présent"
                : attendance.status === "ABSENT_JUSTIFIED"
                  ? "Absence justifiée"
                  : attendance.status === "ABSENT_UNJUSTIFIED"
                    ? "Absence non justifiée"
                    : attendance.status;
              return (
                <tr key={attendance.id}>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{dayDate.toLocaleDateString("fr-FR")}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0" }}>{statusLabel}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{formatTime(attendance.check_in)}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{formatTime(attendance.check_out)}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{formatMinutes(attendance.presence_minutes || 0)}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{formatMinutes(attendance.break_minutes || 0)}</td>
                  <td style={{ padding: "7px 6px", border: "1px solid #e2e8f0", fontWeight: 700, whiteSpace: "nowrap" }}>{formatMinutes(attendance.effective_minutes || 0)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} style={{ padding: 16, border: "1px solid #e2e8f0", color: "#64748b", textAlign: "center" }}>
                  Aucun pointage enregistré pour ce mois.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        id="day-timeline-export"
        style={{ position: "fixed", left: "-9999px", top: 0, backgroundColor: "#ffffff", padding: "40px", width: "800px", zIndex: -1 }}
        aria-hidden="true"
      >
        <h1 style={{ color: "#0f172a", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          Rapport journalier de pointage
        </h1>
        <p style={{ color: "#475569", fontSize: 14, margin: "0 0 24px" }}>
          {exportDate ? formatDateKey(exportDate) : "Date non sélectionnée"}
        </p>
        {exportAttendance ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, backgroundColor: "#f8fafc", padding: 16 }}>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" }}>Heure d’arrivée</p>
                <p style={{ color: "#0f172a", fontSize: 22, fontWeight: 800, margin: 0 }}>{formatTime(exportAttendance.check_in)}</p>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, backgroundColor: "#f8fafc", padding: 16 }}>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" }}>Heure de départ</p>
                <p style={{ color: "#0f172a", fontSize: 22, fontWeight: 800, margin: 0 }}>{formatTime(exportAttendance.check_out)}</p>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: "#0f172a", fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Détail des pauses</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, color: "#1e293b", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                    {["Pause", "Début", "Fin", "Durée"].map((heading) => (
                      <th key={heading} style={{ padding: 8, border: "1px solid #e2e8f0", textAlign: "left" }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BREAK_TYPES.map(({ type, label }) => {
                    const breakItem = exportAttendance.breaks?.find((item) => item.type === type);
                    const duration = breakItem
                      ? getBreakMinutes(breakItem.start_time, breakItem.end_time)
                      : 0;
                    return (
                      <tr key={type}>
                        <td style={{ padding: 8, border: "1px solid #e2e8f0", fontWeight: 700 }}>{label}</td>
                        <td style={{ padding: 8, border: "1px solid #e2e8f0" }}>{breakItem ? formatTime(breakItem.start_time) : "—"}</td>
                        <td style={{ padding: 8, border: "1px solid #e2e8f0" }}>{breakItem ? (breakItem.end_time ? formatTime(breakItem.end_time) : "En cours") : "—"}</td>
                        <td style={{ padding: 8, border: "1px solid #e2e8f0" }}>{breakItem ? formatMinutes(duration) : "0 min"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16 }}>
                <p style={{ color: "#1d4ed8", fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" }}>Temps effectif total</p>
                <p style={{ color: "#1e3a8a", fontSize: 22, fontWeight: 800, margin: 0 }}>{formatMinutes(exportAttendance.effective_minutes || 0)}</p>
              </div>
              <div style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 16 }}>
                <p style={{ color: "#c2410c", fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" }}>Retard total</p>
                <p style={{ color: "#7c2d12", fontSize: 22, fontWeight: 800, margin: 0 }}>
                  {exportLateMinutes === null
                    ? "Donnée indisponible"
                    : exportLateMinutes > 0
                      ? `${exportLateMinutes} min`
                      : "Aucun retard"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: "#64748b", fontSize: 14 }}>Aucun pointage trouvé pour cette date.</p>
        )}
      </div>
    </div>
  );
}
