/**
 * src/components/shared/CreateTaskModal.tsx
 * Reusable "Créer une Tâche" dialog, extracted from TasksPage.
 * Fetches employees internally for the EmployeeCombobox.
 * Props:
 *   isOpen    – controls Dialog visibility
 *   onClose   – called when the dialog should close
 *   onSuccess – called after a task is created successfully
 */

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Plus, AlertCircle, Loader2 } from "lucide-react";
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
import { createTask, type TaskCreatePayload } from "@/api/tasks";
import { listUsers } from "@/api/users";
import { EmployeeCombobox, type EmployeeOption } from "@/components/shared/EmployeeCombobox";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (title: string) => void;
}

const DEFAULT_FORM: TaskCreatePayload = {
  title: "",
  description: "",
  priority: "MEDIUM",
  due_date: "",
  assigned_to: 0,
};

export function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  // Fetch employees internally
  const { data: users = [] } = useQuery({
    queryKey: ["admin-tasks-employees"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
    enabled: isOpen,
  });

  const employees = useMemo(() => users.filter((u) => u.role === "EMPLOYEE"), [users]);

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

  const [form, setForm] = useState<TaskCreatePayload>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Set default employee if none selected yet
  useEffect(() => {
    if (isOpen && form.assigned_to === 0 && employeeOptions.length > 0) {
      setForm((prev) => ({
        ...prev,
        assigned_to: prev.assigned_to || Number(employeeOptions[0].id),
      }));
    }
  }, [isOpen, employeeOptions, form.assigned_to]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      handleClose();
    }
  }

  function handleClose() {
    if (isCreating) return;
    setForm(DEFAULT_FORM);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Le titre de la tâche est obligatoire.");
      return;
    }
    if (!form.assigned_to) {
      setError("Veuillez assigner la tâche à un collaborateur.");
      return;
    }

    setIsCreating(true);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        priority: form.priority,
        due_date: form.due_date || undefined,
        assigned_to: Number(form.assigned_to),
      });

      onSuccess?.(form.title.trim());
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la création de la tâche.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-task-title" className="text-xs font-semibold text-slate-700">
              Titre de la tâche *
            </Label>
            <Input
              id="ct-task-title"
              required
              placeholder="Ex : Révision du rapport de clôture mensuelle"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-xs h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-task-desc" className="text-xs font-semibold text-slate-700">
              Description détaillée
            </Label>
            <textarea
              id="ct-task-desc"
              rows={3}
              placeholder="Précisez les livrables, consignes ou contexte de la mission..."
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-task-assignee" className="text-xs font-semibold text-slate-700">
                Assigné à *
              </Label>
              <EmployeeCombobox
                value={form.assigned_to}
                onChange={(id) => setForm({ ...form, assigned_to: id })}
                employees={employeeOptions}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ct-task-prio" className="text-xs font-semibold text-slate-700">
                Priorité *
              </Label>
              <select
                id="ct-task-prio"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
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
            <Label htmlFor="ct-task-due" className="text-xs font-semibold text-slate-700">
              Date d'échéance
            </Label>
            <Input
              id="ct-task-due"
              type="date"
              value={form.due_date || ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
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
  );
}
