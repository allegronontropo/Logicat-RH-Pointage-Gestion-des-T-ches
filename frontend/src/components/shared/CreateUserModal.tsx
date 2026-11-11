/**
 * src/components/shared/CreateUserModal.tsx
 * Reusable "Ajouter un Utilisateur" dialog, extracted from UsersPage.
 * Props:
 *   isOpen    – controls Dialog visibility
 *   onClose   – called when the dialog should close
 *   onSuccess – called after a user is created successfully (use to invalidate caches, show toasts, etc.)
 */

import { useState } from "react";
import { UserPlus, AlertCircle, Loader2 } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { createUser,
  type UserCreatePayload,
  listUsers,
} from "@/api/users";
import { DepartmentCombobox } from "@/components/shared/DepartmentCombobox";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** List of unique departments for the department combobox. */
  departments?: string[];
  /** Called with the newly-created user's display name after a successful creation. */
  onSuccess?: (name: string) => void;
}

const DEFAULT_FORM: UserCreatePayload = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  role: "EMPLOYEE",
  department: "Ingénierie",
  position: "Développeur",
  hire_date: new Date().toISOString().split("T")[0],
};

export function CreateUserModal({ isOpen, onClose, onSuccess, departments: departmentsProp = [] }: CreateUserModalProps) {
  const [form, setForm] = useState<UserCreatePayload>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch departments from existing users so the combobox always has options,
  // even if the parent hasn't resolved its users query yet.
  const { data: users = [] } = useQuery({
    queryKey: ["create-user-modal-departments"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
    enabled: isOpen,
  });

  const departments = Array.from(
    new Set(
      users
        .map(
          (u) =>
            u.employee_profile?.department ||
            u.department ||
            ""
        )
        .filter((dept): dept is string => Boolean(dept && dept.trim()))
    )
  ).sort();

  const effectiveDepartments = departmentsProp.length > 0 ? departmentsProp : departments;

  function handleOpenChange(open: boolean) {
    if (!open) {
      handleClose();
    }
  }

  function handleClose() {
    if (isCreating) return;
    setForm({ ...DEFAULT_FORM, hire_date: new Date().toISOString().split("T")[0] });
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!form.email.trim()) {
      setError("L'adresse email est obligatoire.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setIsCreating(true);
    try {
      const payload: UserCreatePayload = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        department:
          form.role === "EMPLOYEE" ? form.department?.trim() || undefined : undefined,
        position:
          form.role === "EMPLOYEE" ? form.position?.trim() || undefined : undefined,
        hire_date:
          form.role === "EMPLOYEE" ? form.hire_date || undefined : undefined,
      };

      await createUser(payload);
      onSuccess?.(`${payload.first_name} ${payload.last_name}`);
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la création de l'utilisateur.";
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
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle>Ajouter un Utilisateur</DialogTitle>
          </div>
          <DialogDescription>
            Créez un nouveau compte avec son rôle et son profil associé.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Prénom & Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-fn" className="text-xs font-semibold text-slate-700">
                Prénom *
              </Label>
              <Input
                id="cu-fn"
                required
                placeholder="Ex : Sara"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-ln" className="text-xs font-semibold text-slate-700">
                Nom *
              </Label>
              <Input
                id="cu-ln"
                required
                placeholder="Ex : Bennani"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Email & Mot de passe */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-email" className="text-xs font-semibold text-slate-700">
                Email professionnel *
              </Label>
              <Input
                id="cu-email"
                type="email"
                required
                placeholder="prenom.nom@logicat.ma"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-pwd" className="text-xs font-semibold text-slate-700">
                Mot de passe provisoire *
              </Label>
              <Input
                id="cu-pwd"
                type="password"
                required
                placeholder="Min 8 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Téléphone & Rôle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-phone" className="text-xs font-semibold text-slate-700">
                Téléphone
              </Label>
              <Input
                id="cu-phone"
                placeholder="+212 6..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-role" className="text-xs font-semibold text-slate-700">
                Rôle *
              </Label>
              <select
                id="cu-role"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as "ADMIN_RH" | "EMPLOYEE" })
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="EMPLOYEE">Employé</option>
                <option value="ADMIN_RH">Admin RH</option>
              </select>
            </div>
          </div>

          {/* Conditional Fields for EMPLOYEE */}
          {form.role === "EMPLOYEE" && (
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Profil Employé
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cu-dept" className="text-xs font-semibold text-slate-700">
                    Département
                  </Label>
                  <DepartmentCombobox
                    departments={effectiveDepartments}
                    value={form.department || "ALL"}
                    onChange={(dept: string) => setForm({ ...form, department: dept || undefined })}
                    className="text-xs h-8 bg-slate-50/70"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cu-pos" className="text-xs font-semibold text-slate-700">
                    Poste / Fonction
                  </Label>
                  <Input
                    id="cu-pos"
                    placeholder="Ex : Développeur Fullstack"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-hire" className="text-xs font-semibold text-slate-700">
                  Date d'embauche
                </Label>
                <Input
                  id="cu-hire"
                  type="date"
                  value={form.hire_date}
                  onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                  className="text-xs h-8 bg-white"
                />
              </div>
            </div>
          )}

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
                  <UserPlus className="h-3.5 w-3.5" />
                  Créer l'utilisateur
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
