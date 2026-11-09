import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  createTask,
  updateTask,
  deleteTask,
  type TaskCreatePayload,
  type TaskUpdatePayload,
} from "@/api/tasks";
import { listUsers } from "@/api/users";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";

export default function TasksPage() {
  const queryClient = useQueryClient();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Create Task
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskCreatePayload>({
    title: "",
    description: "",
    priority: "MEDIUM",
    due_date: "",
    assigned_to: 0,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal: Edit Task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<TaskUpdatePayload>({
    title: "",
    description: "",
    priority: "MEDIUM",
    due_date: "",
    assigned_to: 0,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal: Delete Task Confirm
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch Employees for dropdown assignment
  const { data: users = [] } = useQuery({
    queryKey: ["admin-tasks-employees"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
  });

  const employees = users.filter((u) => u.role === "EMPLOYEE");

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
    ],
    queryFn: () =>
      listTasks({
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        assigned_to:
          assigneeFilter !== "ALL" ? Number(assigneeFilter) : undefined,
      }),
  });

  // Client-side text search (title + description)
  const filteredTasks = tasks.filter((t) => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter, statusFilter, assigneeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Task KPI counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  // ── Open Create Modal ───────────────────────────────────────────
  function handleOpenCreate() {
    const defaultEmpId =
      employees[0]?.employee_profile?.id ||
      employees[0]?.employee_id ||
      employees[0]?.id ||
      0;

    setCreateForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      due_date: "",
      assigned_to: defaultEmpId,
    });
    setCreateError(null);
    setIsCreateOpen(true);
  }

  // ── Submit Create Task ──────────────────────────────────────────
  async function handleSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.title.trim()) {
      setCreateError("Le titre de la tâche est obligatoire.");
      return;
    }
    if (!createForm.assigned_to) {
      setCreateError("Veuillez assigner la tâche à un collaborateur.");
      return;
    }

    setIsCreating(true);
    try {
      await createTask({
        title: createForm.title.trim(),
        description: createForm.description?.trim() || undefined,
        priority: createForm.priority,
        due_date: createForm.due_date || undefined,
        assigned_to: Number(createForm.assigned_to),
      });

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsCreateOpen(false);
      setFeedback({
        type: "success",
        message: `La tâche « ${createForm.title} » a été créée avec succès.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la création de la tâche.";
      setCreateError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsCreating(false);
    }
  }

  // ── Open Edit Modal ─────────────────────────────────────────────
  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
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
        due_date: editForm.due_date || null,
        assigned_to: editForm.assigned_to
          ? Number(editForm.assigned_to)
          : undefined,
      });

      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

      {/* ── Filters Card (Search, Priority, Status, Assignee) ──── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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

            {/* Filter Assignee */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="assignee-filter" className="text-xs font-semibold text-slate-700">
                  Assigné à
                </Label>
                {(priorityFilter !== "ALL" || statusFilter !== "ALL" || assigneeFilter !== "ALL" || searchQuery) && (
                  <button
                    onClick={() => {
                      setPriorityFilter("ALL");
                      setStatusFilter("ALL");
                      setAssigneeFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <select
                id="assignee-filter"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
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
              <TableHead>Échéance</TableHead>
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
                    assigneeFilter !== "ALL"
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
            ) : (
              paginatedTasks.map((task) => {
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
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Titre & Description */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-sm">
                        <p className="text-xs font-bold text-slate-900 truncate">
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
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {assigneeName}
                        </span>
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
                              className="rounded bg-rose-100 text-rose-800 text-[9px] px-1 font-bold"
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
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
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
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {filteredTasks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Affichage de{" "}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, filteredTasks.length)}
              </span>{" "}
              sur{" "}
              <span className="font-semibold text-slate-800">
                {filteredTasks.length}
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
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <CheckSquare className="h-4 w-4" />
              </div>
              <DialogTitle>Créer une Tâche</DialogTitle>
            </div>
            <DialogDescription>
              Assignez une nouvelle mission professionnelle à un collaborateur.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4 py-2">
            {createError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-semibold text-slate-700">
                Titre de la tâche *
              </Label>
              <Input
                id="task-title"
                required
                placeholder="Ex : Révision du rapport de clôture mensuelle"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                className="text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-xs font-semibold text-slate-700">
                Description détaillée
              </Label>
              <textarea
                id="task-desc"
                rows={3}
                placeholder="Précisez les livrables, consignes ou contexte de la mission..."
                value={createForm.description || ""}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Assignee & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-assignee" className="text-xs font-semibold text-slate-700">
                  Assigné à *
                </Label>
                <select
                  id="task-assignee"
                  required
                  value={createForm.assigned_to}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      assigned_to: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                >
                  <option value={0} disabled>
                    Choisir un collaborateur...
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

              <div className="space-y-1.5">
                <Label htmlFor="task-prio" className="text-xs font-semibold text-slate-700">
                  Priorité *
                </Label>
                <select
                  id="task-prio"
                  value={createForm.priority}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
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

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="task-due" className="text-xs font-semibold text-slate-700">
                Date d'échéance
              </Label>
              <Input
                id="task-due"
                type="date"
                value={createForm.due_date || ""}
                onChange={(e) =>
                  setCreateForm({ ...createForm, due_date: e.target.value })
                }
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Créer la tâche
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

            {/* Assignee & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-task-assignee" className="text-xs font-semibold text-slate-700">
                  Assigné à *
                </Label>
                <select
                  id="edit-task-assignee"
                  value={editForm.assigned_to || 0}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      assigned_to: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                >
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
    </div>
  );
}
