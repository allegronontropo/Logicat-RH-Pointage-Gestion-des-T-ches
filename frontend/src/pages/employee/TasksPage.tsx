/**
 * src/pages/employee/TasksPage.tsx
 * ---------------------------------
 * Employee Tasks — premium mobile-first design.
 *
 * Desktop (md+): shadcn/ui Data Table with inline filter bar.
 * Mobile:        Stacked Card layout, filters inside a Popover.
 *
 * Employee can ONLY update task status (PATCH /api/tasks/{id}/status).
 * No edit, no delete.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  Calendar,
  Tag,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { getMyTasks, updateTaskStatus } from "@/api/tasks";
import type { Task } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

type Priority = Task["priority"];
type Status = Task["status"];

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Faible",
};

const PRIORITY_CLASS: Record<Priority, string> = {
  HIGH: "bg-rose-100 text-rose-700 border-rose-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<Status, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
};

const STATUS_CLASS: Record<Status, string> = {
  TODO: "bg-slate-100 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  DONE: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_OPTIONS: { value: "" | Status; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "TODO", label: "À faire" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "DONE", label: "Terminée" },
];

const PRIORITY_OPTIONS: { value: "" | Priority; label: string }[] = [
  { value: "", label: "Toutes les priorités" },
  { value: "HIGH", label: "Haute" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "LOW", label: "Faible" },
];

function isLate(task: Task): boolean {
  if (!task.due_date || task.status === "DONE") return false;
  return new Date(task.due_date) < new Date();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Status Selector ────────────────────────────────────────────────────────

function StatusSelector({
  task,
  onUpdate,
  isLoading,
}: {
  task: Task;
  onUpdate: (id: number, status: Status) => void;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nextStatuses: Status[] = (["TODO", "IN_PROGRESS", "DONE"] as Status[]).filter(
    (s) => s !== task.status
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity ${STATUS_CLASS[task.status]} ${
            isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"
          }`}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {STATUS_LABEL[task.status]}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {nextStatuses.map((s) => (
          <button
            key={s}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50 text-left"
            onClick={() => {
              onUpdate(task.id, s);
              setOpen(false);
            }}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                s === "TODO" ? "bg-slate-400" : s === "IN_PROGRESS" ? "bg-blue-500" : "bg-emerald-500"
              }`}
            />
            {STATUS_LABEL[s]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function EmployeeTasksPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"" | Status>("");
  const [filterPriority, setFilterPriority] = useState<"" | Priority>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lateOnly, setLateOnly] = useState(false);
  const [dueDateSort, setDueDateSort] = useState<"" | "asc" | "desc">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", "me"],
    queryFn: () => getMyTasks(),
    refetchInterval: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) =>
      updateTaskStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleUpdate = (id: number, status: Status) => {
    updateMutation.mutate({ id, status });
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (lateOnly && !isLate(t)) return false;
    if (searchTerm.trim() && !t.title.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (!dueDateSort) return 0;
    const aDue = a.due_date ? new Date(a.due_date).getTime() : (dueDateSort === "asc" ? Infinity : -Infinity);
    const bDue = b.due_date ? new Date(b.due_date).getTime() : (dueDateSort === "asc" ? Infinity : -Infinity);
    return dueDateSort === "asc" ? aDue - bDue : bDue - aDue;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageTasks = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPriority, lateOnly, dueDateSort]);

  // ── Counts ──────────────────────────────────────────────────────────────
  const todo = tasks.filter((t) => t.status === "TODO").length;
  const inProg = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const done = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mes Tâches</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {tasks.length} tâche{tasks.length !== 1 ? "s" : ""} assignée
            {tasks.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Mobile filter trigger */}
        <div className="md:hidden">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {(filterStatus || filterPriority || lateOnly || dueDateSort) && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                    {[filterStatus, filterPriority, lateOnly, dueDateSort].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 space-y-3" align="end">
              <p className="text-sm font-semibold text-slate-700">Filtrer par</p>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Statut</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "" | Status)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Priorité</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as "" | Priority)}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Échéance</label>
                <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={lateOnly ? "late" : "all"} onChange={(e) => setLateOnly(e.target.value === "late")}>
                  <option value="all">Toutes les échéances</option>
                  <option value="late">En retard</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Trier par échéance</label>
                <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={dueDateSort} onChange={(e) => setDueDateSort(e.target.value as "" | "asc" | "desc")}>
                  <option value="">Aucun tri</option>
                  <option value="asc">Plus proche d'abord</option>
                  <option value="desc">Plus lointaine d'abord</option>
                </select>
              </div>
              {(filterStatus || filterPriority || lateOnly || dueDateSort) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500"
                  onClick={() => { setFilterStatus(""); setFilterPriority(""); setLateOnly(false); setDueDateSort(""); setFiltersOpen(false); }}
                >
                  Réinitialiser
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Stats Summary (small chips) ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "À faire", count: todo, color: "bg-slate-100 text-slate-700", icon: <Clock className="h-4 w-4" /> },
          { label: "En cours", count: inProg, color: "bg-blue-100 text-blue-700", icon: <AlertCircle className="h-4 w-4" /> },
          { label: "Terminées", count: done, color: "bg-emerald-100 text-emerald-700", icon: <CheckSquare className="h-4 w-4" /> },
        ].map(({ label, count, color, icon }) => (
          <div key={label} className={`${color} rounded-xl p-3 text-center`}>
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="text-xl font-bold">{count}</div>
            <div className="text-xs font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Search and filters ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher une tâche par nom…"
            aria-label="Rechercher une tâche par nom"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <div className="hidden md:flex items-center gap-3">
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "" | Status)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as "" | Priority)}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={lateOnly ? "late" : "all"} onChange={(e) => setLateOnly(e.target.value === "late")} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Filtrer les tâches en retard">
          <option value="all">Toutes les échéances</option>
          <option value="late">En retard</option>
        </select>
        <select value={dueDateSort} onChange={(e) => setDueDateSort(e.target.value as "" | "asc" | "desc")} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Trier par échéance">
          <option value="">Trier par échéance</option>
          <option value="asc">Échéance : plus proche</option>
          <option value="desc">Échéance : plus lointaine</option>
        </select>
        {(filterStatus || filterPriority || lateOnly || dueDateSort || searchTerm) && (
          <button
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
            onClick={() => { setFilterStatus(""); setFilterPriority(""); setLateOnly(false); setDueDateSort(""); setSearchTerm(""); }}
          >
            Effacer filtres
          </button>
        )}
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
        </div>
      </div>

      {/* ── Loading / Error ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Chargement des tâches…</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-600 text-sm">
          Erreur lors du chargement des tâches. Veuillez réessayer.
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {tasks.length === 0 ? "Aucune tâche assignée" : "Aucun résultat pour ces filtres"}
          </p>
          {tasks.length > 0 && (
            <button
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => { setFilterStatus(""); setFilterPriority(""); }}
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* ── MOBILE: Stacked Cards ────────────────────────────────────────── */}
      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="md:hidden space-y-3">
            {pageTasks.map((task) => (
              <Card key={task.id} onClick={() => setSelectedTask(task)} className={`cursor-pointer border hover:bg-slate-50 ${isLate(task) ? "border-rose-200 bg-rose-50/30" : "border-slate-200"}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Top row: title + late badge */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 text-sm leading-snug flex-1">{task.title}</p>
                    {isLate(task) && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        <AlertCircle className="h-2.5 w-2.5" />
                        En retard
                      </span>
                    )}
                  </div>

                  {/* Description (truncated) */}
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_CLASS[task.priority]}`}>
                      <Tag className="h-3 w-3" />
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>

                  {/* Status selector */}
                  <div className="flex items-center justify-between" onClick={(event) => event.stopPropagation()}>
                    <span className="text-xs text-slate-500">Statut :</span>
                    <StatusSelector
                      task={task}
                      onUpdate={handleUpdate}
                      isLoading={updatingId === task.id}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── DESKTOP: Data Table ─────────────────────────────────────── */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Titre</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-28">Priorité</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-36">Statut</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-36">Échéance</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-24 text-right">Retard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`cursor-pointer hover:bg-slate-50 ${isLate(task) ? "bg-rose-50/40" : ""}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_CLASS[task.priority]}`}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div onClick={(event) => event.stopPropagation()}><StatusSelector
                        task={task}
                        onUpdate={handleUpdate}
                        isLoading={updatingId === task.id}
                      /></div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${isLate(task) ? "text-rose-600 font-medium" : "text-slate-600"}`}>
                        {formatDate(task.due_date)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isLate(task) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Retard
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">{filtered.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} sur ${filtered.length}` : "0 tâche"}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>Suivant</Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent>
          {selectedTask && <>
            <DialogHeader>
              <DialogTitle className="pr-7">{selectedTask.title}</DialogTitle>
              <DialogDescription>Détails de la tâche</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Description</p><p className="whitespace-pre-wrap break-words text-slate-700">{selectedTask.description || "Aucune description."}</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Priorité</p><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_CLASS[selectedTask.priority]}`}>{PRIORITY_LABEL[selectedTask.priority]}</span></div>
                <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Statut</p><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[selectedTask.status]}`}>{STATUS_LABEL[selectedTask.status]}</span></div>
                <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Échéance</p><p className="text-slate-700">{formatDate(selectedTask.due_date)}</p></div>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
