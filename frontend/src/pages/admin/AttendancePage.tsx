import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { listUsers } from "@/api/users";
import {
  listAllAttendance,
  declareAbsence,
  justifyAbsence,
  overrideAttendanceStatus,
} from "@/api/attendances";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Attendance, BreakSummary } from "@/types";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];

  // Filters State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
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

  // 1. Fetch Employees for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["admin-attendance-employees"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
  });

  const employees = users.filter((u) => u.role === "EMPLOYEE");

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
      statusFilter,
    ],
    queryFn: () =>
      listAllAttendance({
        employee_id:
          selectedEmployeeId !== "ALL" ? Number(selectedEmployeeId) : undefined,
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

  // Helper: Format Breaks breakdown "Matin: 15m | Déj: 60m | Soir: 15m"
  function renderBreaks(breaks: BreakSummary[]) {
    if (!breaks || breaks.length === 0) {
      return <span className="text-slate-400 font-mono text-xs">—</span>;
    }

    const items = breaks.map((b) => {
      const typeLabel =
        b.type === "MORNING"
          ? "Matin"
          : b.type === "LUNCH"
          ? "Déj"
          : b.type === "EVENING"
          ? "Soir"
          : b.type;

      if (!b.end_time) {
        return `${typeLabel}: en cours`;
      }

      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time).getTime();
      const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
      return `${typeLabel}: ${diffMinutes}m`;
    });

    return (
      <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
        {items.join(" | ")}
      </span>
    );
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
            onClick={() => refetch()}
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

      {/* ── Filters Card (Date, Employee, Status) ─────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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

            {/* Filter 2: Employee Select */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-filter" className="text-xs font-semibold text-slate-700">
                Collaborateur
              </Label>
              <select
                id="emp-filter"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                <option value="ALL">Tous les collaborateurs</option>
                {employees.map((emp) => {
                  const empId =
                    emp.employee_profile?.id || emp.employee_id || emp.id;
                  const dept =
                    emp.employee_profile?.department || emp.department;
                  return (
                    <option key={emp.id} value={empId}>
                      {emp.first_name} {emp.last_name} {dept ? `(${dept})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter 3: Status Filter */}
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
                    {selectedDate || selectedEmployeeId !== "ALL" || statusFilter !== "ALL"
                      ? "Aucun pointage ne correspond aux filtres sélectionnés. Essayez de réinitialiser vos critères."
                      : "Aucun pointage n'a encore été enregistré aujourd'hui."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate("");
                      setSelectedEmployeeId("ALL");
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
                    <TableCell>
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
                    <TableCell className="text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(item.date)}
                    </TableCell>

                    {/* Arrivée / Départ */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {item.check_in || item.check_out ? (
                        <span>
                          {formatTimeAMPM(item.check_in)}{" "}
                          <span className="text-slate-400 font-sans mx-1">/</span>{" "}
                          {formatTimeAMPM(item.check_out)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Pauses (Matin / Déj / Soir) */}
                    <TableCell>{renderBreaks(item.breaks)}</TableCell>

                    {/* Présence */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatDurationHM(item.presence_minutes, hasCheckIn)}
                    </TableCell>

                    {/* Pause Totale */}
                    <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatDurationHM(item.break_minutes, hasCheckIn)}
                    </TableCell>

                    {/* Travail Effectif */}
                    <TableCell className="whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded">
                        {formatDurationHM(item.effective_minutes, hasCheckIn)}
                      </span>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
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
                    <TableCell className="text-right">
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
              <select
                id="abs-emp"
                required
                value={absenceEmployeeId}
                onChange={(e) => setAbsenceEmployeeId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                {employees.map((emp) => {
                  const empId =
                    emp.employee_profile?.id || emp.employee_id || emp.id;
                  const dept =
                    emp.employee_profile?.department || emp.department;
                  return (
                    <option key={emp.id} value={empId}>
                      {emp.first_name} {emp.last_name} {dept ? `(${dept})` : ""}
                    </option>
                  );
                })}
              </select>
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
    </div>
  );
}
