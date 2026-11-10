import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Clock,
  CalendarX,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
  Check,
  Pencil,
  Loader2,
  X,
  LogOut,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { listUsers } from "@/api/users";
import {
  listAllAttendance,
  declareAbsence,
  justifyAbsence,
  overrideAttendanceStatus,
} from "@/api/attendances";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Attendance } from "@/types";
import { EmployeeCombobox } from "@/components/shared/EmployeeCombobox";
import { DepartmentCombobox } from "@/components/shared/DepartmentCombobox";

type EmployeeOption = {
  id: string | number;
  firstName: string;
  lastName: string;
  employee_profile?: { id: string | number };
  employee_id?: string | number;
};
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];

  // Filters State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Sort State
  const [sortColumn, setSortColumn] = useState<
    "employee" | "date" | "presence" | "break" | "effective" | "status"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Declare Absence
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
  const [absenceEmployeeId, setAbsenceEmployeeId] = useState<string>("");
  const [absenceStartDate, setAbsenceStartDate] = useState<string>(todayStr);
  const [absenceEndDate, setAbsenceEndDate] = useState<string>(todayStr);
  const [absenceStatus, setAbsenceStatus] = useState<
    "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED"
  >("ABSENT_UNJUSTIFIED");
  const [absenceJustification, setAbsenceJustification] = useState("");
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [declareError, setDeclareError] = useState<string | null>(null);

  // Modal: Justify Absence
  const [justifyingAttendance, setJustifyingAttendance] =
    useState<Attendance | null>(null);
  const [justifyNote, setJustifyNote] = useState("");
  const [isJustifying, setIsJustifying] = useState(false);
  const [justifyError, setJustifyError] = useState<string | null>(null);

  // Modal: Manage Departure (Early Leave / Permission)
  const [departureAttendance, setDepartureAttendance] =
    useState<Attendance | null>(null);
  const [departureStatus, setDepartureStatus] = useState<
    "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED"
  >("ABSENT_JUSTIFIED");
  const [departureNote, setDepartureNote] = useState("Permission exceptionnelle");
  const [isSubmittingDeparture, setIsSubmittingDeparture] = useState(false);
  const [departureError, setDepartureError] = useState<string | null>(null);

  // Modal: Global Monthly Report
  const [isGlobalReportOpen, setIsGlobalReportOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(
    new Date().toISOString().split("T")[0].substring(0, 7)
  ); // YYYY-MM
  const [reportDepartment, setReportDepartment] = useState<string>("ALL");
  const [globalReportData, setGlobalReportData] = useState<{
    totalEffective: number;
    totalLunch: number;
    totalMorningAfternoon: number;
    attendanceCount: number;
  } | null>(null);
  const [globalReportExporting, setGlobalReportExporting] = useState(false);

  // Handle URL parameter to auto-open the global report modal
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const openReport = searchParams.get("open_report");
    if (openReport === "true") {
      setIsGlobalReportOpen(true);
      // Remove the param from URL so a page refresh doesn't reopen it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("open_report");
      setSearchParams(newParams.toString(), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle URL parameter to auto-open the absence declaration modal
  useEffect(() => {
    const openAbsence = searchParams.get("open_absence");
    if (openAbsence === "true") {
      setIsDeclareOpen(true);
      // Remove the param from URL so a page refresh doesn't reopen it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("open_absence");
      setSearchParams(newParams.toString(), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Helper to format minutes as "450h 30m"
  function formatTotalMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  }

  // ── PDF Export Rate Limiting (localStorage) ──────────────────────
  const STORAGE_KEY = "pdf_export_limit";
  const MAX_EXPORTS_PER_DAY = 3;

  function getTodayStr(): string {
    return new Date().toISOString().split("T")[0];
  }

  function getExportData(): { date: string; count: number } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === getTodayStr()) {
          return data;
        }
      }
    } catch {
      // ignore parse errors
    }
    return { date: getTodayStr(), count: 0 };
  }

  function checkExportLimit(): boolean {
    const data = getExportData();
    return data.count < MAX_EXPORTS_PER_DAY;
  }

  function recordExport(): void {
    const data = getExportData();
    data.count += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getRemainingExports(): number {
    const data = getExportData();
    return Math.max(0, MAX_EXPORTS_PER_DAY - data.count);
  }

  // 1. Fetch Employees for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["admin-attendance-employees"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
  });

  const employees = users.filter((u) => u.role === "EMPLOYEE");

  // Convert to EmployeeOption shape for the combobox
  const employeeOptions: EmployeeOption[] = useMemo(
    () =>
      employees.map((emp) => ({
        id: emp.employee_profile?.id || emp.employee_id || emp.id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        department: emp.employee_profile?.department || emp.department || undefined,
      })),
    [employees]
  );

  // Unique departments for the Department filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      const dept = (
        emp.employee_profile?.department ||
        emp.department ||
        ""
      ).trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [employees]);

  // 3. Fetch Global Report Data (for selected month & department)
  const { data: globalAttendances = [], isLoading: isGlobalReportLoading, refetch: refetchGlobalReport } = useQuery({
    queryKey: ["attendances", "global-report", reportMonth, reportDepartment],
    queryFn: () => {
      const [year, month] = reportMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
      return listAllAttendance({
        department: reportDepartment !== "ALL" ? reportDepartment : undefined,
        date_from: startDate,
        date_to: endDate,
      });
    },
    enabled: Boolean(reportMonth),
  });

  // 2. Fetch Attendance Records with filters
  const {
    data: attendances = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "attendances",
      "admin-list",
      selectedDate,
      selectedEmployeeId,
      selectedDepartment,
      statusFilter,
    ],
    queryFn: () =>
      listAllAttendance({
        employee_id:
          selectedEmployeeId !== "ALL" ? Number(selectedEmployeeId) : undefined,
        department:
          selectedDepartment !== "ALL" ? selectedDepartment : undefined,
        date: selectedDate ? selectedDate : undefined,
      }),
  });

  // Client-side status filter if specified
  const filteredAttendances = attendances.filter((item) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PRESENT") return item.status === "PRESENT";
    if (statusFilter === "ABSENT_JUSTIFIED")
      return item.status === "ABSENT_JUSTIFIED";
    if (statusFilter === "ABSENT_UNJUSTIFIED")
      return item.status === "ABSENT_UNJUSTIFIED";
    return true;
  });

  // Sort handler
  function handleSort(
    column: "employee" | "date" | "presence" | "break" | "effective" | "status"
  ) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  // Apply sort to filtered data
  const sortedAttendances = useMemo(() => {
    return [...filteredAttendances].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "employee": {
          const nameA = (
            a.employee_name ||
            (a.employee
              ? `${a.employee.first_name} ${a.employee.last_name}`
              : `Employé #${a.employee_id}`)
          ).toLowerCase();
          const nameB = (
            b.employee_name ||
            (b.employee
              ? `${b.employee.first_name} ${b.employee.last_name}`
              : `Employé #${b.employee_id}`)
          ).toLowerCase();
          cmp = nameA.localeCompare(nameB, "fr");
          break;
        }
        case "date": {
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        }
        case "presence": {
          cmp = (a.presence_minutes || 0) - (b.presence_minutes || 0);
          break;
        }
        case "break": {
          cmp = (a.break_minutes || 0) - (b.break_minutes || 0);
          break;
        }
        case "effective": {
          cmp = (a.effective_minutes || 0) - (b.effective_minutes || 0);
          break;
        }
        case "status": {
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        }
        default:
          cmp = 0;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredAttendances, sortColumn, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, selectedEmployeeId, statusFilter, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedAttendances.length / PAGE_SIZE));
  const paginatedAttendances = sortedAttendances.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Helper: Format Time as "09:00 AM" / "06:00 PM"
  function formatTimeAMPM(isoStr?: string | null): string {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Helper: Format duration in minutes into "Xh Ym" (e.g., 9h 00m)
  function formatDurationHM(minutes?: number | null, isAvailable: boolean = true): string {
    if (!isAvailable || minutes === null || minutes === undefined) {
      return "—";
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  }

  // ── Open Declare Absence Modal ──────────────────────────────────
  function handleOpenDeclare() {
    setAbsenceEmployeeId(
      employees[0]?.employee_profile?.id
        ? String(employees[0].employee_profile.id)
        : employees[0]?.employee_id
        ? String(employees[0].employee_id)
        : String(employees[0]?.id || "")
    );
    setAbsenceStartDate(todayStr);
    setAbsenceEndDate(todayStr);
    setAbsenceStatus("ABSENT_UNJUSTIFIED");
    setAbsenceJustification("");
    setDeclareError(null);
    setIsDeclareOpen(true);
  }

  // ── Submit Declare Absence ──────────────────────────────────────
  async function handleSubmitDeclare(e: React.FormEvent) {
    e.preventDefault();
    setDeclareError(null);

    const empIdNum = Number(absenceEmployeeId);
    if (!empIdNum || isNaN(empIdNum)) {
      setDeclareError("Veuillez sélectionner un employé.");
      return;
    }
    if (!absenceStartDate || !absenceEndDate) {
      setDeclareError("Veuillez renseigner les dates de début et de fin.");
      return;
    }
    if (absenceStartDate > absenceEndDate) {
      setDeclareError(
        "La date de début doit être antérieure ou égale à la date de fin."
      );
      return;
    }

    setIsDeclaring(true);
    try {
      await declareAbsence({
        employee_id: empIdNum,
        start_date: absenceStartDate,
        end_date: absenceEndDate,
        status: absenceStatus,
        justification_note: absenceJustification.trim() || undefined,
      });

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setIsDeclareOpen(false);
      setFeedback({
        type: "success",
        message: "L'absence a été enregistrée avec succès.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la déclaration d'absence.";
      setDeclareError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsDeclaring(false);
    }
  }

  // ── Open Justify Modal ──────────────────────────────────────────
  function handleOpenJustify(attendance: Attendance) {
    setJustifyingAttendance(attendance);
    setJustifyNote(attendance.justification_note || "");
    setJustifyError(null);
  }

  // ── Submit Justify Absence ──────────────────────────────────────
  async function handleSubmitJustify(e: React.FormEvent) {
    e.preventDefault();
    if (!justifyingAttendance) return;
    setJustifyError(null);

    if (!justifyNote.trim()) {
      setJustifyError("Veuillez renseigner un motif de justification.");
      return;
    }

    setIsJustifying(true);
    try {
      await justifyAbsence(justifyingAttendance.id, justifyNote.trim());
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setJustifyingAttendance(null);
      setFeedback({
        type: "success",
        message: "L'absence a été marquée comme justifiée.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la validation.";
      setJustifyError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsJustifying(false);
    }
  }

  // ── Open Departure Modal ────────────────────────────────────────
  function handleOpenDeparture(attendance: Attendance) {
    setDepartureAttendance(attendance);
    setDepartureStatus("ABSENT_JUSTIFIED");
    setDepartureNote("Permission exceptionnelle");
    setDepartureError(null);
  }

  // ── Submit Departure Override ───────────────────────────────────
  async function handleSubmitDeparture(e: React.FormEvent) {
    e.preventDefault();
    if (!departureAttendance) return;
    setDepartureError(null);

    setIsSubmittingDeparture(true);
    try {
      await overrideAttendanceStatus(departureAttendance.id, {
        status: departureStatus,
        justification_note: departureNote.trim() || undefined,
      });

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setDepartureAttendance(null);
      setFeedback({
        type: "success",
        message:
          "Le départ / permission a été validé et le statut de présence mis à jour.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la mise à jour.";
      setDepartureError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmittingDeparture(false);
    }
  }

  // ── Global Report Handlers ────────────────────────────────────────
  function handleGenerateGlobalReport() {
    refetchGlobalReport();
  }

  // Effect to process global report data when it loads
  useEffect(() => {
    if (globalAttendances.length > 0) {
      let totalEffective = 0;
      let totalLunch = 0;
      let totalMorningAfternoon = 0;

      globalAttendances.forEach((att) => {
        totalEffective += att.effective_minutes || 0;
        (att.breaks || []).forEach((b) => {
          if (b.start_time && b.end_time) {
            const start = new Date(b.start_time).getTime();
            const end = new Date(b.end_time).getTime();
            const mins = Math.max(0, Math.round((end - start) / 60000));
            if (b.type === "LUNCH") {
              totalLunch += mins;
            } else {
              totalMorningAfternoon += mins;
            }
          }
        });
      });

      setGlobalReportData({
        totalEffective,
        totalLunch,
        totalMorningAfternoon,
        attendanceCount: globalAttendances.length,
      });
    } else if (!isGlobalReportLoading) {
      setGlobalReportData({
        totalEffective: 0,
        totalLunch: 0,
        totalMorningAfternoon: 0,
        attendanceCount: 0,
      });
    }
  }, [globalAttendances, isGlobalReportLoading]);

  async function handleExportGlobalReportPDF() {
    if (!globalReportData) return;

    // Check rate limit
    if (!checkExportLimit()) {
      setFeedback({
        type: "error",
        message: "Limite d'exports PDF atteinte (3/jour). Veuillez réessayer demain.",
      });
      return;
    }

    const container = document.getElementById("global-report-pdf-container");
    if (!container) return;

    setGlobalReportExporting(true);
    try {
      container.classList.remove("hidden");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      container.classList.add("hidden");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

      const deptLabel = reportDepartment === "ALL" ? "Tous_Departements" : reportDepartment;
      pdf.save(`rapport_mensuel_${deptLabel}_${reportMonth}.pdf`);

      // Record the export after successful generation
      recordExport();

      setFeedback({
        type: "success",
        message: "Rapport PDF généré avec succès.",
      });
    } catch (err: unknown) {
      container.classList.add("hidden");
      setFeedback({
        type: "error",
        message: "Erreur lors de la génération du PDF.",
      });
    } finally {
      setGlobalReportExporting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ── Top Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary border border-blue-100 shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Suivi des Pointages & Présences
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Surveillance en temps réel des arrivées, pauses, départs et absences
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries();
              refetch();
            }}
            disabled={isFetching}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
          >
            <RotateCw
              className={`h-3.5 w-3.5 mr-1.5 text-slate-500 ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span>Actualiser</span>
          </Button>

          <Button
            onClick={handleOpenDeclare}
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm gap-1.5"
          >
            <CalendarX className="h-4 w-4" />
            <span>Déclarer une Absence</span>
          </Button>

          <Button
            onClick={() => setIsGlobalReportOpen(true)}
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-blue-800 text-white shadow-sm gap-1.5"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Rapport Global</span>
          </Button>
        </div>
      </div>

      {/* ── Feedback Alert Banner ──────────────────────────────── */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-xs font-medium flex items-center justify-between border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Filters Card (Date, Employee, Department, Status) ── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            {/* Filter 1: Date Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="date-filter" className="text-xs font-semibold text-slate-700">
                  Date observée
                </Label>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Toutes les dates
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs h-9 bg-slate-50/70 focus:bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Filter 2: Employee Combobox */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Collaborateur
              </Label>
              <EmployeeCombobox
                value={selectedEmployeeId}
                onChange={(val: string | number) => setSelectedEmployeeId(val ? String(val) : "ALL")}
                employees={employeeOptions}
                showAllOption={true}
                className="bg-slate-50/70 font-medium"
              />
            </div>

            {/* Filter 3: Department Combobox */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Département
              </Label>
              <DepartmentCombobox
                value={selectedDepartment}
                onChange={(dept: string) => setSelectedDepartment(dept || "ALL")}
                departments={departments}
                className="bg-slate-50/70 font-medium"
              />
            </div>

            {/* Filter 4: Status Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-xs font-semibold text-slate-700">
                Statut
              </Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PRESENT">Présent (Check-in effectué)</option>
                <option value="ABSENT_JUSTIFIED">Absence Justifiée</option>
                <option value="ABSENT_UNJUSTIFIED">Absence Non Justifiée</option>
              </select>
            </div>

            {/* Quick Actions / Reset */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setSelectedEmployeeId("ALL");
                  setSelectedDepartment("ALL");
                  setStatusFilter("ALL");
                }}
                className="h-9 px-3 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200 w-full"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDate("");
                  setSelectedEmployeeId("ALL");
                  setSelectedDepartment("ALL");
                  setStatusFilter("ALL");
                }}
                className="h-9 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 w-full"
              >
                Effacer filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Attendance Data Table ──────────────────────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              {/* 1. Employé */}
              <TableHead
                className="w-[220px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("employee")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Employé</span>
                  {sortColumn === "employee" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 2. Date */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Date</span>
                  {sortColumn === "date" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 3. Arrivée / Départ */}
              <TableHead className="font-semibold text-slate-800 whitespace-nowrap">
                Arrivée / Départ
              </TableHead>

              {/* 4. Pauses (Matin / Déj / Soir) */}
              <TableHead className="min-w-[190px] font-semibold text-slate-800 whitespace-nowrap">
                Pauses (Matin / Déj / Soir)
              </TableHead>

              {/* 5. Présence */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("presence")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Présence</span>
                  {sortColumn === "presence" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 6. Pause Totale */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("break")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Pause Totale</span>
                  {sortColumn === "break" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 7. Travail Effectif */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("effective")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Travail Effectif</span>
                  {sortColumn === "effective" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 8. Statut */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span>Statut</span>
                  {sortColumn === "status" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-slate-300 opacity-60" />
                  )}
                </div>
              </TableHead>

              {/* 9. Actions */}
              <TableHead className="text-right font-semibold text-slate-800">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-slate-100 rounded" />
                        <div className="h-2 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-16 bg-slate-100 rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : sortedAttendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                    <Clock className="h-6 w-6 stroke-[1.7]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Aucun enregistrement de pointage
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {selectedDate || selectedEmployeeId !== "ALL" || selectedDepartment !== "ALL" || statusFilter !== "ALL"
                      ? "Aucun pointage ne correspond aux filtres sélectionnés. Essayez de réinitialiser vos critères."
                      : "Aucun pointage n'a encore été enregistré aujourd'hui."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate("");
                      setSelectedEmployeeId("ALL");
                      setSelectedDepartment("ALL");
                      setStatusFilter("ALL");
                    }}
                    className="mt-4 text-xs font-semibold"
                  >
                    Voir l'ensemble des pointages
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAttendances.map((item) => {
                const employeeName =
                  item.employee_name ||
                  (item.employee
                    ? `${item.employee.first_name} ${item.employee.last_name}`
                    : `Employé #${item.employee_id}`);

                const dept =
                  item.employee?.department ||
                  item.employee?.position ||
                  "Collaborateur";

                const initials =
                  employeeName
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase() || "EM";

                const isPresent = item.status === "PRESENT";
                const isJustified = item.status === "ABSENT_JUSTIFIED";
                const isUnjustified = item.status === "ABSENT_UNJUSTIFIED";
                const hasCheckIn = Boolean(item.check_in);

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Employé */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {employeeName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {dept}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs font-medium text-slate-700 whitespace-nowrap py-2">
                      {formatDate(item.date)}
                    </TableCell>

                    {/* Arrivée / Départ */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap py-2">
                      {item.check_in || item.check_out ? (
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span className="text-slate-600">
                            Arrivée: <span className="font-medium text-slate-900">{formatTimeAMPM(item.check_in)}</span>
                          </span>
                          <span className="text-slate-600">
                            Départ: <span className="font-medium text-slate-900">{item.check_out ? formatTimeAMPM(item.check_out) : "—"}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Pauses (Matin / Déj / Soir) */}
                    <TableCell className="py-2">
                      {item.breaks && item.breaks.length > 0 ? (
                        <Link
                          to={`/admin/users/${item.employee_id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          {item.breaks.length} pause{item.breaks.length > 1 ? "s" : ""}
                          <ArrowRight className="h-3 w-3 text-slate-500" />
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Présence */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap py-2 text-right">
                      {formatDurationHM(item.presence_minutes, hasCheckIn)}
                    </TableCell>

                    {/* Pause Totale */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap py-2 text-right">
                      {formatDurationHM(item.break_minutes, hasCheckIn)}
                    </TableCell>

                    {/* Travail Effectif */}
                    <TableCell className="whitespace-nowrap py-2 text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded">
                        {formatDurationHM(item.effective_minutes, hasCheckIn)}
                      </span>
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="py-2">
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-emerald-700 border border-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          PRÉSENT
                        </span>
                      ) : isJustified ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-amber-700 border border-amber-200/80">
                            ABSENT_JUSTIFIÉ
                          </span>
                          {item.justification_note && (
                            <p className="text-[10px] text-slate-500 italic truncate max-w-[150px]">
                              « {item.justification_note} »
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-rose-700 border border-rose-200/80">
                          ABSENT_UNJUSTIFIÉ
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPresent && !item.check_out && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDeparture(item)}
                            className="h-7 px-2 text-xs text-amber-700 bg-amber-50/70 border-amber-200 hover:bg-amber-100 font-semibold gap-1 whitespace-nowrap"
                            title="Gérer le départ anticipé ou la permission d'absence"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>Gérer le départ</span>
                          </Button>
                        )}

                        {isUnjustified ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenJustify(item)}
                            className="h-7 px-2.5 text-xs text-primary border-blue-200 hover:bg-blue-50 font-semibold gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Justifier</span>
                          </Button>
                        ) : isJustified ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenJustify(item)}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
                            title="Modifier la note de justification"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        ) : !isPresent || item.check_out ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {sortedAttendances.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Affichage de{" "}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, sortedAttendances.length)}
              </span>{" "}
              sur{" "}
              <span className="font-semibold text-slate-800">
                {sortedAttendances.length}
              </span>{" "}
              enregistrements
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 text-xs font-semibold px-3"
              >
                Précédent
              </Button>
              <span className="text-xs font-semibold text-slate-600 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 text-xs font-semibold px-3"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── MODAL 1: Declare Absence Dialog ─────────────────────── */}
      <Dialog open={isDeclareOpen} onOpenChange={setIsDeclareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <CalendarX className="h-4 w-4" />
              </div>
              <DialogTitle>Déclarer une Absence</DialogTitle>
            </div>
            <DialogDescription>
              Enregistrez une absence justifiée ou non justifiée pour un collaborateur.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDeclare} className="space-y-4 py-2">
            {declareError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{declareError}</span>
              </div>
            )}

            {/* Select Employee */}
            <div className="space-y-1.5">
              <Label htmlFor="abs-emp" className="text-xs font-semibold text-slate-700">
                Collaborateur *
              </Label>
              <EmployeeCombobox
                value={absenceEmployeeId ? Number(absenceEmployeeId) : 0}
                onChange={(id: string | number) => setAbsenceEmployeeId(String(id))}
                employees={employeeOptions}
              />
            </div>

            {/* Multi-Day Dates: Date de début and Date de fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="abs-start-date"
                  className="text-xs font-semibold text-slate-700"
                >
                  Date de début *
                </Label>
                <Input
                  id="abs-start-date"
                  type="date"
                  required
                  value={absenceStartDate}
                  onChange={(e) => setAbsenceStartDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="abs-end-date"
                  className="text-xs font-semibold text-slate-700"
                >
                  Date de fin *
                </Label>
                <Input
                  id="abs-end-date"
                  type="date"
                  required
                  value={absenceEndDate}
                  onChange={(e) => setAbsenceEndDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="abs-status" className="text-xs font-semibold text-slate-700">
                Nature de l'absence *
              </Label>
              <select
                id="abs-status"
                value={absenceStatus}
                onChange={(e) =>
                  setAbsenceStatus(
                    e.target.value as "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED"
                  )
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="ABSENT_UNJUSTIFIED">Non justifiée</option>
                <option value="ABSENT_JUSTIFIED">Justifiée (avec justificatif)</option>
              </select>
            </div>

            {/* Justification Note */}
            <div className="space-y-1.5">
              <Label htmlFor="abs-note" className="text-xs font-semibold text-slate-700">
                Motif / Note de justification
              </Label>
              <textarea
                id="abs-note"
                rows={3}
                placeholder="Ex : Certificat médical, congé autorisé, déplacement…"
                value={absenceJustification}
                onChange={(e) => setAbsenceJustification(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeclareOpen(false)}
                disabled={isDeclaring}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isDeclaring}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
              >
                {isDeclaring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <CalendarX className="h-3.5 w-3.5" />
                    Enregistrer l'absence
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Justify Absence Dialog ─────────────────────── */}
      <Dialog
        open={Boolean(justifyingAttendance)}
        onOpenChange={(open) => !open && setJustifyingAttendance(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <DialogTitle>Justifier l'absence</DialogTitle>
            </div>
            <DialogDescription>
              Enregistrez le motif de justification pour valider cette absence.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitJustify} className="space-y-4 py-2">
            {justifyError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{justifyError}</span>
              </div>
            )}

            {justifyingAttendance && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500">
                  Employé :{" "}
                  <span className="font-semibold text-slate-800">
                    {justifyingAttendance.employee_name ||
                      `Employé #${justifyingAttendance.employee_id}`}
                  </span>
                </p>
                <p className="text-slate-500">
                  Date :{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDate(justifyingAttendance.date)}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="justify-note-input" className="text-xs font-semibold text-slate-700">
                Motif de justification *
              </Label>
              <textarea
                id="justify-note-input"
                rows={3}
                required
                autoFocus
                placeholder="Ex : Certificat médical reçu par RH..."
                value={justifyNote}
                onChange={(e) => setJustifyNote(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJustifyingAttendance(null)}
                disabled={isJustifying}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isJustifying}
                className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
              >
                {isJustifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Validation…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Valider la justification
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Manage Departure Dialog ─────────────────────── */}
      <Dialog
        open={Boolean(departureAttendance)}
        onOpenChange={(open) => !open && setDepartureAttendance(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <LogOut className="h-4 w-4" />
              </div>
              <DialogTitle>Gérer le départ anticipé</DialogTitle>
            </div>
            <DialogDescription>
              Validez une sortie ou permission pour{" "}
              {departureAttendance?.employee_name ||
                `Employé #${departureAttendance?.employee_id}`}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDeparture} className="space-y-4 py-2">
            {departureError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{departureError}</span>
              </div>
            )}

            {departureAttendance && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500">
                  Arrivée pointée :{" "}
                  <span className="font-semibold text-slate-800">
                    {departureAttendance.check_in
                      ? formatDateTime(departureAttendance.check_in)
                      : "—"}
                  </span>
                </p>
                <p className="text-slate-500">
                  Date :{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDate(departureAttendance.date)}
                  </span>
                </p>
              </div>
            )}

            {/* Target Status */}
            <div className="space-y-1.5">
              <Label htmlFor="dep-status" className="text-xs font-semibold text-slate-700">
                Nouveau statut de la journée *
              </Label>
              <select
                id="dep-status"
                value={departureStatus}
                onChange={(e) =>
                  setDepartureStatus(
                    e.target.value as "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED"
                  )
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="ABSENT_JUSTIFIED">
                  Absence Justifiée (Permission exceptionnelle / Départ autorisé)
                </option>
                <option value="ABSENT_UNJUSTIFIED">
                  Absence Non Justifiée (Sortie non autorisée)
                </option>
              </select>
            </div>

            {/* Justification note */}
            <div className="space-y-1.5">
              <Label htmlFor="dep-note" className="text-xs font-semibold text-slate-700">
                Motif / Note de justification *
              </Label>
              <textarea
                id="dep-note"
                rows={3}
                required
                autoFocus
                placeholder="Ex : Permission exceptionnelle pour motif familial accordée par RH..."
                value={departureNote}
                onChange={(e) => setDepartureNote(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDepartureAttendance(null)}
                disabled={isSubmittingDeparture}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingDeparture}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
              >
                {isSubmittingDeparture ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Valider le départ
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: Global Monthly Report ─────────────────────────── */}
      <Dialog open={isGlobalReportOpen} onOpenChange={setIsGlobalReportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary bg-opacity-10 text-primary">
                <BarChart3 className="h-4 w-4" />
              </div>
              <DialogTitle>Rapport Mensuel Global</DialogTitle>
            </div>
            <DialogDescription>
              Ventilation du temps de travail par département sur un mois donné.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="report-month" className="text-xs font-semibold text-slate-700">
                  Mois
                </Label>
                <Input
                  id="report-month"
                  type="month"
                  value={reportMonth}
                  onChange={(e) => {
                    setReportMonth(e.target.value);
                    setGlobalReportData(null);
                  }}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-dept" className="text-xs font-semibold text-slate-700">
                  Département
                </Label>
                <DepartmentCombobox
                  id="report-dept"
                  value={reportDepartment}
                  onChange={(dept: string) => {
                    setReportDepartment(dept || "ALL");
                    setGlobalReportData(null);
                  }}
                  departments={departments}
                  className="bg-white font-medium"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateGlobalReport}
              disabled={isGlobalReportLoading}
              className="w-full bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
            >
              {isGlobalReportLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Chargement…
                </>
              ) : (
                <>
                  <RotateCw className="h-3.5 w-3.5" />
                  Générer le rapport
                </>
              )}
            </Button>

            {/* Report Content */}
            {globalReportData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Travail Effectif
                      </span>
                      <PieChartIcon className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                      {formatTotalMinutes(globalReportData.totalEffective)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700">
                        Pause Déjeuner
                      </span>
                      <PieChartIcon className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-amber-900 mt-1">
                      {formatTotalMinutes(globalReportData.totalLunch)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-700">
                        Pauses Matin/Soir
                      </span>
                      <PieChartIcon className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-blue-900 mt-1">
                      {formatTotalMinutes(globalReportData.totalMorningAfternoon)}
                    </p>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="md:w-1/2 flex items-center justify-center h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Travail Effectif", value: globalReportData.totalEffective, color: "#10b981" },
                            { name: "Pause Déjeuner", value: globalReportData.totalLunch, color: "#f59e0b" },
                            { name: "Pauses Matin/Soir", value: globalReportData.totalMorningAfternoon, color: "#3b82f6" },
                          ].filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          label={false}
                          labelLine={false}
                        >
                          {[
                            { name: "Travail Effectif", value: globalReportData.totalEffective, color: "#10b981" },
                            { name: "Pause Déjeuner", value: globalReportData.totalLunch, color: "#f59e0b" },
                            { name: "Pauses Matin/Soir", value: globalReportData.totalMorningAfternoon, color: "#3b82f6" },
                          ].filter((d) => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value, entry: any) => {
                            const chartData = [
                              { name: "Travail Effectif", value: globalReportData.totalEffective, color: "#10b981" },
                              { name: "Pause Déjeuner", value: globalReportData.totalLunch, color: "#f59e0b" },
                              { name: "Pauses Matin/Soir", value: globalReportData.totalMorningAfternoon, color: "#3b82f6" },
                            ].filter((d) => d.value > 0);
                            const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                            const percent = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
                            return (
                              <span className="text-xs font-medium text-slate-700">
                                {value} ({percent}%)
                              </span>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="md:w-1/2 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Détail des durées
                    </h4>
                    <div className="space-y-2">
                      {globalReportData.totalEffective > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
                            <span className="text-xs font-semibold text-slate-700">Travail Effectif</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {formatTotalMinutes(globalReportData.totalEffective)}
                            </span>
                            {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0 && (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {Math.round((globalReportData.totalEffective / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {globalReportData.totalLunch > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                            <span className="text-xs font-semibold text-slate-700">Pause Déjeuner</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {formatTotalMinutes(globalReportData.totalLunch)}
                            </span>
                            {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0 && (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {Math.round((globalReportData.totalLunch / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {globalReportData.totalMorningAfternoon > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                            <span className="text-xs font-semibold text-slate-700">Pauses Matin/Soir</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {formatTotalMinutes(globalReportData.totalMorningAfternoon)}
                            </span>
                            {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0 && (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {Math.round((globalReportData.totalMorningAfternoon / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {(globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon) === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs">
                          Aucune donnée de pointage pour cette période.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF Export Button */}
                <div className="space-y-2">
                  <Button
                    onClick={handleExportGlobalReportPDF}
                    disabled={globalReportExporting || !checkExportLimit()}
                    variant="outline"
                    className="w-full h-9 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 gap-1.5"
                  >
                    {globalReportExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                    ) : (
                      <PieChartIcon className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Exporter PDF</span>
                  </Button>
                  <p className="text-center text-[10px] text-slate-500">
                    Exports restants aujourd'hui : {getRemainingExports()}/{MAX_EXPORTS_PER_DAY}
                  </p>
                </div>
              </div>
            )}

            {!globalReportData && !isGlobalReportLoading && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Sélectionnez un mois et un département, puis cliquez sur "Générer le rapport".
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hidden PDF Report Container ── */}
      <div id="global-report-pdf-container" className="hidden bg-white p-8">
        <div style={{ maxWidth: "800px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
          {/* Header */}
          <div className="mb-8 pb-4 border-b-2 border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Rapport Mensuel Global</h1>
                <p className="text-sm text-slate-500">
                  {reportDepartment === "ALL" ? "Tous les départements" : reportDepartment} • {reportMonth}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Généré le {new Date().toLocaleDateString("fr-FR")} • {globalReportData?.attendanceCount || 0} jour(s) de pointage
            </div>
          </div>

          {/* Summary Table */}
          <table className="w-full border-collapse mb-8" style={{ fontSize: "11px" }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-3 font-semibold text-slate-700">Catégorie</th>
                <th className="text-right p-3 font-semibold text-slate-700">Pourcentage</th>
                <th className="text-right p-3 font-semibold text-slate-700">Durée</th>
              </tr>
            </thead>
            <tbody>
              {globalReportData?.totalEffective && globalReportData.totalEffective > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-800 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
                    Travail Effectif
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900">
                    {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0
                      ? Math.round((globalReportData.totalEffective / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)
                      : 0}%
                  </td>
                  <td className="p-3 text-right text-slate-600">
                    {formatTotalMinutes(globalReportData.totalEffective)}
                  </td>
                </tr>
              )}
              {globalReportData?.totalLunch && globalReportData.totalLunch > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-800 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                    Pause Déjeuner
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900">
                    {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0
                      ? Math.round((globalReportData.totalLunch / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)
                      : 0}%
                  </td>
                  <td className="p-3 text-right text-slate-600">
                    {formatTotalMinutes(globalReportData.totalLunch)}
                  </td>
                </tr>
              )}
              {globalReportData?.totalMorningAfternoon && globalReportData.totalMorningAfternoon > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-800 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                    Pauses Matin/Soir
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900">
                    {globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon > 0
                      ? Math.round((globalReportData.totalMorningAfternoon / (globalReportData.totalEffective + globalReportData.totalLunch + globalReportData.totalMorningAfternoon)) * 100)
                      : 0}%
                  </td>
                  <td className="p-3 text-right text-slate-600">
                    {formatTotalMinutes(globalReportData.totalMorningAfternoon)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Chart */}
          <div className="flex justify-center">
            <ResponsiveContainer width={600} height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Travail Effectif", value: globalReportData?.totalEffective || 0, color: "#10b981" },
                    { name: "Pause Déjeuner", value: globalReportData?.totalLunch || 0, color: "#f59e0b" },
                    { name: "Pauses Matin/Soir", value: globalReportData?.totalMorningAfternoon || 0, color: "#3b82f6" },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {[
                    { name: "Travail Effectif", value: globalReportData?.totalEffective || 0, color: "#10b981" },
                    { name: "Pause Déjeuner", value: globalReportData?.totalLunch || 0, color: "#f59e0b" },
                    { name: "Pauses Matin/Soir", value: globalReportData?.totalMorningAfternoon || 0, color: "#3b82f6" },
                  ].filter((d) => d.value > 0).map((entry, index) => (
                    <Cell key={`pdf-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
