import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function EmployeeHistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
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

  const handleExportMonth = async () => {
    setIsExporting("month");
    try {
      const element = document.getElementById("heatmap-calendar");
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`historique-${monthKey}.pdf`);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportDay = async () => {
    if (!selectedDay || !selectedAttendance) return;
    setIsExporting("day");
    try {
      const element = document.getElementById("day-timeline-export");
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`pointage-${getDayKey(selectedDay)}.pdf`);
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
          <Button variant="outline" size="sm" onClick={handleExportDay} disabled={isExporting === "day" || !selectedAttendance || isLoading} className="gap-1.5">
            {isExporting === "day" ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /><span>Export...</span></> : <><Download className="h-3.5 w-3.5" /><span>Exporter la journée</span></>}
          </Button>
        </div>
      </div>

      <AttendanceCalendar
        attendances={attendances}
        currentMonth={currentMonth}
        isLoading={isLoading}
        onDaySelected={(day, attendance) => {
          setSelectedDay(day);
          setSelectedAttendance(attendance);
        }}
      />
    </div>
  );
}
