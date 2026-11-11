import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  RotateCw,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  TrendingUp,
  X,
  AlertTriangle,
  User,
  Building2,
  UserCheck,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  listTasks,
  updateTask,
  deleteTask,
  type TaskUpdatePayload,
} from "@/api/tasks";
import { listUsers } from "@/api/users";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";
import { EmployeeCombobox, type EmployeeOption } from "@/components/shared/EmployeeCombobox";
import { DepartmentCombobox } from "@/components/shared/DepartmentCombobox";
import { CreateTaskModal } from "@/components/shared/CreateTaskModal";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [isLateFilter, setIsLateFilter] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"due_date" | "title" | "priority" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  function handleSort(column: "due_date" | "title" | "priority") {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Create Task
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Modal: Edit Task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskUpdatePayload>({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    due_date: "",
    assigned_to: 0,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal: Delete Task Confirm
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal: Reassign Task
  const [reassignTaskId, setReassignTaskId] = useState<number | null>(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState<string>("");
  const [reassignEmployeeName, setReassignEmployeeName] = useState("");
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  // 1. Fetch Employees for dropdown assignment
  const { data: users = [] } = useQuery({
    queryKey: ["admin-tasks-employees"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
  });

  const employees = users.filter((u) => u.role === "EMPLOYEE");

  // Deep link: /admin/tasks?assigned_to=<employeeId> preselects the employee
  // filter. Used by the user-deletion flow to reassign blocking tasks.
  // assigned_to is always an employee id (employees.id), never a user id.
  useEffect(() => {
    const assignedTo = searchParams.get("assigned_to");
    if (!assignedTo) return;

    const match = users.find(
      (u) =>
        u.role === "EMPLOYEE" &&
        String(u.employee_profile?.id ?? u.employee_id ?? "") === assignedTo
    );
    const resolvedId = match
      ? String(match.employee_profile?.id ?? match.employee_id)
      : assignedTo;

    setAssigneeFilter(resolvedId);
    setCurrentPage(1);
  }, [searchParams, users]);

  // Convert employees to EmployeeOption shape for the combobox
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

  // 2. Fetch Tasks with query filters
  const {
    data: tasks = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-tasks",
      priorityFilter,
      statusFilter,
      assigneeFilter,
      isLateFilter,
    ],
    queryFn: () =>
      listTasks({
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        assigned_to:
          assigneeFilter !== "ALL" ? Number(assigneeFilter) : undefined,
        is_late:
          isLateFilter !== "ALL" ? isLateFilter === "true" : undefined,
      }),
  });

  // Build department map from employees
  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((emp) => {
      const empId = emp.employee_profile?.id || emp.employee_id || emp.id;
      const dept =
        emp.employee_profile?.department || emp.department || "Sans Département";
      map.set(empId, dept);
    });
    return map;
  }, [employees]);

  // Extract unique departments from employees list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      const dept = emp.employee_profile?.department || emp.department;
      if (dept && dept.trim()) {
        set.add(dept.trim());
      }
    });
    return Array.from(set).sort();
  }, [employees]);

  // Available employees filtered by selected department
  const availableEmployees = useMemo(() => {
    if (departmentFilter === "ALL") return employees;
    return employees.filter((emp) => {
      const dept =
        emp.employee_profile?.department || emp.department || "Sans Département";
      return dept === departmentFilter;
    });
  }, [employees, departmentFilter]);

  // Available employees mapped to EmployeeOption shape for combobox
  const availableEmployeeOptions: EmployeeOption[] = useMemo(
    () =>
      availableEmployees.map((emp) => ({
        id: emp.employee_profile?.id || emp.employee_id || emp.id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        department: emp.employee_profile?.department || emp.department || undefined,
      })),
    [availableEmployees]
  );

  // Get department display name for a task
  function getTaskDepartment(task: Task): string {
    const empId = task.assignee?.employee_id || task.assigned_to;
    return deptMap.get(empId) || "Sans Département";
  }

  // Client-side text search & department filter
  const filteredTasks = tasks.filter((t) => {
    // Filter by department
    if (departmentFilter !== "ALL") {
      const taskDept = getTaskDepartment(t);
      if (taskDept !== departmentFilter) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(q);
    const descMatch = t.description?.toLowerCase().includes(q);
    const assigneeMatch = t.assignee
      ? `${t.assignee.first_name} ${t.assignee.last_name}`
          .toLowerCase()
          .includes(q)
      : false;
    return titleMatch || descMatch || assigneeMatch;
  });

  // Sort tasks by selected column, or by department (default)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortColumn === "due_date") {
        const hasDateA = Boolean(a.due_date && !isNaN(new Date(a.due_date).getTime()));
        const hasDateB = Boolean(b.due_date && !isNaN(new Date(b.due_date).getTime()));
        if (!hasDateA && !hasDateB) return 0;
        if (!hasDateA) return 1;
        if (!hasDateB) return -1;
        const diff = new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        return sortDirection === "asc" ? diff : -diff;
      }

      if (sortColumn === "title") {
        const diff = a.title.localeCompare(b.title, "fr");
        return sortDirection === "asc" ? diff : -diff;
      }

      if (sortColumn === "priority") {
        const pOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const diff = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
        return sortDirection === "asc" ? diff : -diff;
      }

      // Default: department (alphabetical, with 'Sans Département' last), then by id desc
      const deptA = getTaskDepartment(a);
      const deptB = getTaskDepartment(b);
      if (deptA !== deptB) {
        if (deptA === "Sans Département") return 1;
        if (deptB === "Sans Département") return -1;
        return deptA.localeCompare(deptB, "fr");
      }
      return b.id - a.id;
    });
  }, [filteredTasks, deptMap, sortColumn, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    priorityFilter,
    statusFilter,
    departmentFilter,
    assigneeFilter,
    isLateFilter,
    sortColumn,
    sortDirection,
  ]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Group the paginated tasks by department for the current page view
  const pageGroups = useMemo(() => {
    const groups: { department: string; tasks: Task[] }[] = [];
    paginatedTasks.forEach((task) => {
      const dept = getTaskDepartment(task);
      const last = groups[groups.length - 1];
      if (last && last.department === dept) {
        last.tasks.push(task);
      } else {
        groups.push({ department: dept, tasks: [task] });
      }
    });
    return groups;
  }, [paginatedTasks, deptMap]);

  // Task KPI counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  // ── Open Create Modal ───────────────────────────────────────────
  function handleOpenCreate() {
    setIsCreateOpen(true);
  }

  // ── Open Edit Modal ─────────────────────────────────────────────
  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || "",
      assigned_to: task.assigned_to,
    });
    setEditError(null);
  }

  // ── Submit Edit Task ────────────────────────────────────────────
  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setEditError(null);

    if (!editForm.title?.trim()) {
      setEditError("Le titre de la tâche est obligatoire.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateTask(editingTask.id, {
        title: editForm.title.trim(),
        description: editForm.description?.trim() || undefined,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null,
        assigned_to: editForm.assigned_to
          ? Number(editForm.assigned_to)
          : undefined,
      });

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      setEditingTask(null);
      setFeedback({
        type: "success",
        message: "La tâche a été modifiée avec succès.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la modification.";
      setEditError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsUpdating(false);
    }
  }

  // ── Submit Delete Task ──────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deletingTask) return;

    setIsDeleting(true);
    try {
      await deleteTask(deletingTask.id);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeletingTask(null);
      setFeedback({
        type: "success",
        message: `La tâche #${deletingTask.id} a été supprimée.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la suppression.";
      setFeedback({
        type: "error",
        message: typeof msg === "string" ? msg : "Opération refusée.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Open Reassign Dialog ─────────────────────────────────────────
  function handleOpenReassign(task: Task) {
    setReassignTaskId(task.id);
    setReassignEmployeeId(String(task.assigned_to));
    const emp = employees.find(
      (e) =>
        (e.employee_profile?.id || e.employee_id || e.id) === task.assigned_to
    );
    setReassignEmployeeName(
      emp ? `${emp.first_name} ${emp.last_name}` : `Employé #${task.assigned_to}`
    );
    setShowReassignDialog(true);
  }

  // ── Confirm Reassign (opens AlertDialog) ─────────────────────────
  function handleConfirmReassign() {
    if (!reassignTaskId) return;
    const targetEmp = employees.find(
      (e) =>
        (e.employee_profile?.id || e.employee_id || e.id) ===
        Number(reassignEmployeeId)
    );
    setReassignEmployeeName(
      targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : ""
    );
    setShowReassignDialog(false);
    setShowConfirmDialog(true);
  }

  // ── Submit Reassign (API call) ───────────────────────────────────
  async function handleSubmitReassign() {
    if (!reassignTaskId || !reassignEmployeeId) return;

    setIsReassigning(true);
    try {
      await updateTask(reassignTaskId, {
        assigned_to: Number(reassignEmployeeId),
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Keep the users page in sync: a reassignment can unblock deletion.
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setFeedback({
        type: "success",
        message: `La tâche a été réassignée avec succès à ${reassignEmployeeName}.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la réassignation.";
      setFeedback({
        type: "error",
        message: typeof msg === "string" ? msg : "Opération refusée.",
      });
    } finally {
      setReassignTaskId(null);
      setReassignEmployeeId("");
      setReassignEmployeeName("");
      setShowConfirmDialog(false);
      setIsReassigning(false);
    }
  }

  function renderTaskRow(task: Task) {
    const assigneeName = task.assignee
      ? `${task.assignee.first_name} ${task.assignee.last_name}`
      : `Employé #${task.assigned_to}`;

    const initials = task.assignee
      ? `${task.assignee.first_name[0] || ""}${task.assignee.last_name[0] || ""}`.toUpperCase()
      : "EM";

    // Priority badges
    const priorityBadge =
      task.priority === "HIGH"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : task.priority === "MEDIUM"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

    const priorityLabel =
      task.priority === "HIGH"
        ? "Haute"
        : task.priority === "MEDIUM"
        ? "Moyenne"
        : "Basse";

    // Status badges
    const statusBadge =
      task.status === "DONE"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : task.status === "IN_PROGRESS"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

    const statusLabel =
      task.status === "DONE"
        ? "Terminé"
        : task.status === "IN_PROGRESS"
        ? "En cours"
        : "À faire";

    // Past due check
    const isPastDue =
      task.due_date &&
      task.status !== "DONE" &&
      new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

    return (
      <TableRow
        key={task.id}
        className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
        onClick={() => handleOpenEdit(task)}
      >
        {/* Titre & Description */}
        <TableCell>
          <div className="space-y-0.5 max-w-sm">
            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
              {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {task.description}
              </p>
            )}
          </div>
        </TableCell>

        {/* Assigné à */}
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-[10px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {assigneeName}
              </span>
              {sortColumn && (
                <span className="text-[10px] text-slate-400 truncate block">
                  {getTaskDepartment(task)}
                </span>
              )}
            </div>
          </div>
        </TableCell>

        {/* Priorité */}
        <TableCell>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold border ${priorityBadge}`}
          >
            {priorityLabel}
          </span>
        </TableCell>

        {/* Échéance */}
        <TableCell>
          {task.due_date ? (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span
                className={
                  isPastDue ? "text-rose-600 font-bold" : "text-slate-700"
                }
              >
                {formatDate(task.due_date)}
              </span>
              {isPastDue && (
                <span
                  className="rounded border border-rose-200 bg-rose-50 text-rose-700 text-[9px] px-1 font-bold"
                  title="Date d'échéance dépassée"
                >
                  En retard
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs font-mono">—</span>
          )}
        </TableCell>

        {/* Statut */}
        <TableCell>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${statusBadge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                task.status === "DONE"
                  ? "bg-emerald-500"
                  : task.status === "IN_PROGRESS"
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
            />
            {statusLabel}
          </span>
        </TableCell>

        {/* Actions Menu */}
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel>Action Tâche #{task.id}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => handleOpenEdit(task)}
                className="gap-2 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                <span>Modifier</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleOpenReassign(task)}
                className="gap-2 cursor-pointer text-primary hover:text-primary-800"
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Réassigner</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDeletingTask(task)}
                destructive
                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ── Top Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary border border-blue-100 shadow-sm">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Gestion des Tâches
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Assignation, suivi de progression et administration des missions
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
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-blue-800 text-white shadow-sm shadow-blue-900/20 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Créer une Tâche</span>
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

      {/* ── KPI Counter Mini-Strip ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total des Tâches
            </span>
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {isLoading ? "…" : totalCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              À faire
            </span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-700 mt-2">
            {isLoading ? "…" : todoCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              En cours
            </span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-800 mt-2">
            {isLoading ? "…" : inProgressCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Terminées
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            {isLoading ? "…" : doneCount}
          </p>
        </div>
      </div>

      {/* ── Filters Card (Search, Department, Priority, Status, Assignee) ── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label htmlFor="task-search" className="text-xs font-semibold text-slate-700">
                Rechercher
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="task-search"
                  placeholder="Titre, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-slate-50/70 focus:bg-white border-slate-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Département
              </Label>
              <DepartmentCombobox
                value={departmentFilter}
                onChange={(dept: string) => {
                  setDepartmentFilter(dept || "ALL");
                  setAssigneeFilter("ALL");
                }}
                departments={departments}
                className="bg-slate-50/70 font-medium"
              />
            </div>

            {/* Filter Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="prio-filter" className="text-xs font-semibold text-slate-700">
                Priorité
              </Label>
              <select
                id="prio-filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                <option value="ALL">Toutes les priorités</option>
                <option value="HIGH">Haute</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="LOW">Basse</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="space-y-1.5">
              <Label htmlFor="stat-filter" className="text-xs font-semibold text-slate-700">
                Statut
              </Label>
              <select
                id="stat-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="TODO">À faire</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="DONE">Terminé</option>
              </select>
            </div>

            {/* Filter Échéance (Late / On time) */}
            <div className="space-y-1.5">
              <Label htmlFor="late-filter" className="text-xs font-semibold text-slate-700">
                Échéance
              </Label>
              <select
                id="late-filter"
                value={isLateFilter}
                onChange={(e) => setIsLateFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary h-9 font-medium"
              >
                <option value="ALL">Toutes les échéances</option>
                <option value="false">À l'heure</option>
                <option value="true">En retard</option>
              </select>
            </div>

            {/* Filter Assignee */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="assignee-filter" className="text-xs font-semibold text-slate-700">
                  Assigné à
                </Label>
                {(priorityFilter !== "ALL" || statusFilter !== "ALL" || assigneeFilter !== "ALL" || departmentFilter !== "ALL" || isLateFilter !== "ALL" || searchQuery || sortColumn !== null) && (
                  <button
                    onClick={() => {
                      setPriorityFilter("ALL");
                      setStatusFilter("ALL");
                      setAssigneeFilter("ALL");
                      setDepartmentFilter("ALL");
                      setIsLateFilter("ALL");
                      setSearchQuery("");
                      setSortColumn(null);
                      setSortDirection("asc");
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <EmployeeCombobox
                value={assigneeFilter}
                onChange={(val) => setAssigneeFilter(val ? String(val) : "ALL")}
                employees={availableEmployeeOptions}
                showAllOption={true}
                className="bg-slate-50/70 font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tasks Data Table Card ─────────────────────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[340px]">Titre</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-slate-900 transition-colors"
                onClick={() => handleSort("due_date")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Échéance</span>
                  {sortColumn === "due_date" ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
                  )}
                </div>
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="h-3 w-48 bg-slate-100 rounded" />
                      <div className="h-2 w-32 bg-slate-50 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-8 bg-slate-100 rounded-lg ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                    <CheckSquare className="h-6 w-6 stroke-[1.7]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Aucune tâche trouvée
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery ||
                    priorityFilter !== "ALL" ||
                    statusFilter !== "ALL" ||
                    assigneeFilter !== "ALL" ||
                    departmentFilter !== "ALL" ||
                    isLateFilter !== "ALL"
                      ? "Aucune tâche ne correspond à vos filtres. Essayez d'ajuster ou de réinitialiser vos critères."
                      : "Aucune tâche n'a été créée pour le moment."}
                  </p>
                  <Button
                    onClick={handleOpenCreate}
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Créer la première tâche
                  </Button>
                </TableCell>
              </TableRow>
            ) : sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                    <CheckSquare className="h-6 w-6 stroke-[1.7]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Aucune tâche trouvée
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery ||
                    priorityFilter !== "ALL" ||
                    statusFilter !== "ALL" ||
                    assigneeFilter !== "ALL" ||
                    departmentFilter !== "ALL" ||
                    isLateFilter !== "ALL"
                      ? "Aucune tâche ne correspond à vos filtres. Essayez d'ajuster ou de réinitialiser vos critères."
                      : "Aucune tâche n'a été créée pour le moment."}
                  </p>
                  <Button
                    onClick={handleOpenCreate}
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Créer la première tâche
                  </Button>
                </TableCell>
              </TableRow>
            ) : sortColumn ? (
              paginatedTasks.map((task) => renderTaskRow(task))
            ) : (
              pageGroups.map((group) => (
                <React.Fragment key={`dept-group-${group.department}`}>
                  {/* Department Group Sub-Header */}
                  <TableRow className="bg-slate-50/90 border-y border-slate-200/90 hover:bg-slate-50/90">
                    <TableCell colSpan={6} className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 shadow-2xs">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 tracking-wide">
                          {group.department}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-slate-200 shadow-2xs">
                          {group.tasks.length} {group.tasks.length > 1 ? "tâches" : "tâche"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Tasks under this department */}
                  {group.tasks.map((task) => renderTaskRow(task))}
                </React.Fragment>
              ))
            )}
      </TableBody>
    </Table>

    {/* Pagination Bar */}
    {sortedTasks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Affichage de{" "}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, sortedTasks.length)}
              </span>{" "}
              sur{" "}
              <span className="font-semibold text-slate-800">
                {sortedTasks.length}
              </span>{" "}
              tâches
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

      {/* ── MODAL 1: Create Task Dialog ─────────────────────────── */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (taskTitle) => {
          await refetch();
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          setFeedback({
            type: "success",
            message: `La tâche « ${taskTitle} » a été créée avec succès.`,
          });
        }}
      />

      {/* ── MODAL 2: Edit Task Dialog ───────────────────────────── */}
      <Dialog
        open={Boolean(editingTask)}
        onOpenChange={(open) => !open && setEditingTask(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <Pencil className="h-4 w-4" />
              </div>
              <DialogTitle>Modifier la Tâche #{editingTask?.id}</DialogTitle>
            </div>
            <DialogDescription>
              Mettez à jour les consignes, la priorité ou le responsable de la tâche.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-title" className="text-xs font-semibold text-slate-700">
                Titre de la tâche *
              </Label>
              <Input
                id="edit-task-title"
                required
                value={editForm.title || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-desc" className="text-xs font-semibold text-slate-700">
                Description détaillée
              </Label>
              <textarea
                id="edit-task-desc"
                rows={3}
                value={editForm.description || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Assignee & Priority & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-task-assignee" className="text-xs font-semibold text-slate-700">
                  Assigné à *
                </Label>
                <EmployeeCombobox
                  value={editForm.assigned_to || 0}
                  onChange={(id) =>
                    setEditForm({ ...editForm, assigned_to: Number(id) || 0 })
                  }
                  employees={employeeOptions}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-task-prio" className="text-xs font-semibold text-slate-700">
                  Priorité *
                </Label>
                <select
                  id="edit-task-prio"
                  value={editForm.priority || "MEDIUM"}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      priority: e.target.value as "LOW" | "MEDIUM" | "HIGH",
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                >
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-status" className="text-xs font-semibold text-slate-700">
                Statut *
              </Label>
              <select
                id="edit-task-status"
                value={editForm.status || "TODO"}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    status: e.target.value as "TODO" | "IN_PROGRESS" | "DONE",
                  })
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="TODO">À faire</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="DONE">Terminé</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-due" className="text-xs font-semibold text-slate-700">
                Date d'échéance
              </Label>
              <Input
                id="edit-task-due"
                type="date"
                value={editForm.due_date || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, due_date: e.target.value })
                }
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTask(null)}
                disabled={isUpdating}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Delete Task Confirmation Dialog ─────────────── */}
      <Dialog
        open={Boolean(deletingTask)}
        onOpenChange={(open) => !open && setDeletingTask(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </div>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la tâche « {deletingTask?.title} » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingTask(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: Reassign Task Dialog ─────────────────────────── */}
      <Dialog
        open={showReassignDialog}
        onOpenChange={setShowReassignDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <User className="h-4 w-4" />
              </div>
              <DialogTitle>Réassigner la Tâche</DialogTitle>
            </div>
            <DialogDescription>
              Sélectionnez le nouveau collaborateur responsable de cette tâche.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reassign-emp" className="text-xs font-semibold text-slate-700">
                Nouveau collaborateur *
              </Label>
              <select
                id="reassign-emp"
                required
                value={reassignEmployeeId}
                onChange={(e) => setReassignEmployeeId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="" disabled>
                  Choisir un collaborateur…
                </option>
                {employees.map((emp) => {
                  const empId =
                    emp.employee_profile?.id || emp.employee_id || emp.id;
                  const dept =
                    emp.employee_profile?.department || emp.department;
                  return (
                    <option key={emp.id} value={empId}>
                      {emp.first_name} {emp.last_name}{" "}
                      {dept ? `(${dept})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReassignDialog(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmReassign}
                disabled={!reassignEmployeeId}
                className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
              >
                Confirmer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 5: Confirm Reassign AlertDialog ─────────────────── */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <DialogTitle>Confirmer la réassignation</DialogTitle>
            </div>
            <DialogDescription>
              Êtes-vous sûr de vouloir réassigner cette tâche à{" "}
              <span className="font-semibold text-slate-900">
                {reassignEmployeeName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isReassigning}
              className="text-xs"
            >
              Non
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitReassign}
              disabled={!reassignTaskId || isReassigning}
              className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
            >
              {isReassigning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Réassignation…
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Oui
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
