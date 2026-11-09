import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  UserX,
  UserCheck,
  KeyRound,
  RotateCw,
  Mail,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Building,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/auth/useAuth";
import {
  listUsers,
  updateUser,
  deactivateUser,
  activateUser,
  resetPassword,
  type UserUpdatePayload,
} from "@/api/users";
import type { UserDetail } from "@/types";
import { CreateUserModal } from "@/components/shared/CreateUserModal";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN_RH" | "EMPLOYEE">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Notifications & Feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<UserDetail | null>(null);

  // Form States - Edit User
  const [editForm, setEditForm] = useState<UserUpdatePayload>({
    first_name: "",
    last_name: "",
    phone: "",
    role: "EMPLOYEE",
    department: "",
    position: "",
    hire_date: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form States - Reset Password
  const [newPassword, setNewPassword] = useState("");
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Action Loading state for row-level actions
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Fetch Users Query
  const {
    data: users = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-users", searchQuery, roleFilter],
    queryFn: () =>
      listUsers({
        q: searchQuery.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      }),
  });

  // Extract unique departments from users list
  const departments = Array.from(
    new Set(
      users
        .map(
          (u) =>
            u.employee_profile?.department ||
            u.department ||
            (u.role === "ADMIN_RH" ? "Administration" : null)
        )
        .filter((dept): dept is string => Boolean(dept && dept.trim()))
    )
  ).sort();

  // Filter users by selected department
  const filteredUsers = users.filter((u) => {
    if (departmentFilter === "ALL") return true;
    const userDept =
      u.employee_profile?.department ||
      u.department ||
      (u.role === "ADMIN_RH" ? "Administration" : "");
    return userDept === departmentFilter;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── Open Create Modal ───────────────────────────────────────────
  function handleOpenCreate() {
    setIsCreateOpen(true);
  }

  // ── Open Edit Modal ─────────────────────────────────────────────
  function handleOpenEdit(targetUser: UserDetail) {
    setEditingUser(targetUser);
    setEditError(null);
    setEditForm({
      first_name: targetUser.first_name,
      last_name: targetUser.last_name,
      phone: targetUser.phone || "",
      role: targetUser.role,
      department: targetUser.employee_profile?.department || targetUser.department || "",
      position: targetUser.employee_profile?.position || targetUser.position || "",
      hire_date: targetUser.employee_profile?.hire_date || targetUser.hire_date || "",
    });
  }

  // ── Submit Edit User ────────────────────────────────────────────
  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editForm.first_name?.trim() || !editForm.last_name?.trim()) {
      setEditError("Le prénom et le nom sont obligatoires.");
      return;
    }

    setIsUpdating(true);
    try {
      const payload: UserUpdatePayload = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone?.trim() || undefined,
        role: editForm.role,
        department:
          editForm.role === "EMPLOYEE"
            ? editForm.department?.trim() || undefined
            : undefined,
        position:
          editForm.role === "EMPLOYEE"
            ? editForm.position?.trim() || undefined
            : undefined,
        hire_date:
          editForm.role === "EMPLOYEE"
            ? editForm.hire_date || undefined
            : undefined,
      };

      await updateUser(editingUser.id, payload);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      setFeedback({
        type: "success",
        message: `Informations de ${payload.first_name} ${payload.last_name} mises à jour.`,
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

  // ── Toggle User Active / Deactivate ─────────────────────────────
  async function handleToggleActive(targetUser: UserDetail) {
    setActionLoadingId(targetUser.id);
    setFeedback(null);
    try {
      if (targetUser.is_active) {
        await deactivateUser(targetUser.id);
        setFeedback({
          type: "success",
          message: `Le compte de ${targetUser.first_name} ${targetUser.last_name} a été désactivé.`,
        });
      } else {
        await activateUser(targetUser.id);
        setFeedback({
          type: "success",
          message: `Le compte de ${targetUser.first_name} ${targetUser.last_name} a été réactivé.`,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors du changement de statut.";
      setFeedback({
        type: "error",
        message: typeof msg === "string" ? msg : "Opération refusée.",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  // ── Submit Password Reset ───────────────────────────────────────
  async function handleSubmitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwdUser) return;
    setResetPwdError(null);

    if (!newPassword || newPassword.length < 8) {
      setResetPwdError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(resetPwdUser.id, newPassword);
      setFeedback({
        type: "success",
        message: `Mot de passe réinitialisé pour ${resetPwdUser.first_name} ${resetPwdUser.last_name}.`,
      });
      setResetPwdUser(null);
      setNewPassword("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la réinitialisation.";
      setResetPwdError(typeof msg === "string" ? msg : "Erreur.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* ── Top Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary border border-blue-100 shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Gestion des Utilisateurs
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez, ajoutez et gérez les comptes Administrateurs RH et Employés
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
            <UserPlus className="h-4 w-4" />
            <span>Ajouter un Utilisateur</span>
          </Button>
        </div>
      </div>

      {/* ── Global Feedback Alert ─────────────────────────────── */}
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

      {/* ── Filters & Search Bar Card ─────────────────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, prénom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/60 focus:bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline-block">
                Rôle :
              </span>
              <div className="relative">
                <select
                  aria-label="Filtrer par rôle"
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value as "ALL" | "ADMIN_RH" | "EMPLOYEE")
                  }
                  className="appearance-none rounded-lg border border-slate-200 bg-slate-50/70 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
                >
                  <option value="ALL">Tous les rôles</option>
                  <option value="ADMIN_RH">Admin RH</option>
                  <option value="EMPLOYEE">Employé</option>
                </select>
                <Filter className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline-block">
                Département :
              </span>
              <div className="relative">
                <select
                  aria-label="Filtrer par département"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-slate-50/70 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
                >
                  <option value="ALL">Tous les départements</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <Building className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Users Data Table Card ─────────────────────────────── */}
      <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[280px]">Nom complet</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-slate-200 rounded" />
                        <div className="h-2 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-36 bg-slate-200 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 bg-slate-200 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-8 bg-slate-100 rounded-lg ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                    <Users className="h-6 w-6 stroke-[1.7]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Aucun utilisateur trouvé
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery || roleFilter !== "ALL" || departmentFilter !== "ALL"
                      ? "Aucun compte ne correspond à vos critères de recherche. Essayez d'ajuster ou de réinitialiser vos filtres."
                      : "Aucun utilisateur n'est actuellement enregistré dans la base."}
                  </p>
                  {(searchQuery || roleFilter !== "ALL" || departmentFilter !== "ALL") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setRoleFilter("ALL");
                        setDepartmentFilter("ALL");
                      }}
                      className="mt-4 text-xs font-semibold"
                    >
                      Réinitialiser les filtres
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((targetUser) => {
                const initials =
                  `${targetUser.first_name?.[0] || ""}${targetUser.last_name?.[0] || ""}`.toUpperCase() ||
                  "U";
                const isAdmin = targetUser.role === "ADMIN_RH";
                const isCurrent = currentUser?.id === targetUser.id;
                const department =
                  targetUser.employee_profile?.department ||
                  targetUser.department ||
                  (isAdmin ? "Administration" : "—");
                const position =
                  targetUser.employee_profile?.position ||
                  targetUser.position;

                return (
                  <TableRow
                    key={targetUser.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Nom Complet */}
                    <TableCell>
                      <Link
                        to={`/admin/users/${targetUser.id}`}
                        className="flex items-center gap-3 group cursor-pointer"
                        title="Consulter la fiche profil de l'utilisateur"
                      >
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm transition-transform group-hover:scale-105 ${
                            isAdmin
                              ? "bg-gradient-to-tr from-indigo-600 to-blue-700"
                              : "bg-gradient-to-tr from-blue-600 to-cyan-600"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                              {targetUser.first_name} {targetUser.last_name}
                            </span>
                            {isCurrent && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-primary border border-blue-200/60">
                                Vous
                              </span>
                            )}
                          </div>
                          {position && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {position}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{targetUser.email}</span>
                      </div>
                    </TableCell>

                    {/* Rôle */}
                    <TableCell>
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/70">
                          <Shield className="h-3 w-3" />
                          Admin RH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                          Employé
                        </span>
                      )}
                    </TableCell>

                    {/* Département */}
                    <TableCell>
                      <span className="text-xs text-slate-600 font-medium">
                        {department}
                      </span>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      {targetUser.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Inactif
                        </span>
                      )}
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoadingId === targetUser.id}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          >
                            {actionLoadingId === targetUser.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                            <span className="sr-only">Menu Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>
                            Actions • {targetUser.first_name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* Voir la fiche profil */}
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/users/${targetUser.id}`)}
                            className="gap-2 cursor-pointer font-medium text-primary hover:text-blue-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Voir la fiche profil</span>
                          </DropdownMenuItem>

                          {/* Modifier */}
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(targetUser)}
                            className="gap-2 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            <span>Modifier les détails</span>
                          </DropdownMenuItem>

                          {/* Réinitialiser Mot de passe */}
                          <DropdownMenuItem
                            onClick={() => {
                              setResetPwdUser(targetUser);
                              setNewPassword("");
                              setResetPwdError(null);
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                            <span>Réinitialiser Mot de passe</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Activer / Désactiver */}
                          {targetUser.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(targetUser)}
                              destructive
                              className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>Désactiver le compte</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(targetUser)}
                              className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Activer le compte</span>
                            </DropdownMenuItem>
                          )}
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
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Affichage de{" "}
              <span className="font-semibold text-slate-800">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              à{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}
              </span>{" "}
              sur{" "}
              <span className="font-semibold text-slate-800">
                {filteredUsers.length}
              </span>{" "}
              utilisateurs
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

      {/* ── MODAL 1: Create User Dialog ─────────────────────────── */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (userName) => {
          await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          setFeedback({
            type: "success",
            message: `L'utilisateur ${userName} a été créé avec succès.`,
          });
        }}
      />

      {/* ── MODAL 2: Edit User Dialog ───────────────────────────── */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <Pencil className="h-4 w-4" />
              </div>
              <DialogTitle>Modifier l'Utilisateur</DialogTitle>
            </div>
            <DialogDescription>
              Modifiez les informations personnelles ou la fonction de {editingUser?.first_name}{" "}
              {editingUser?.last_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {/* Email (Readonly in edit) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Email professionnel (Identifiant)
              </Label>
              <Input
                disabled
                value={editingUser?.email || ""}
                className="text-xs h-9 bg-slate-50 cursor-not-allowed"
              />
            </div>

            {/* Prénom & Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fn" className="text-xs font-semibold text-slate-700">
                  Prénom *
                </Label>
                <Input
                  id="edit-fn"
                  required
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-ln" className="text-xs font-semibold text-slate-700">
                  Nom *
                </Label>
                <Input
                  id="edit-ln"
                  required
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Téléphone & Rôle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs font-semibold text-slate-700">
                  Téléphone
                </Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold text-slate-700">
                  Rôle *
                </Label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as "ADMIN_RH" | "EMPLOYEE",
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                >
                  <option value="EMPLOYEE">Employé</option>
                  <option value="ADMIN_RH">Admin RH</option>
                </select>
              </div>
            </div>

            {/* Conditional Employee fields */}
            {editForm.role === "EMPLOYEE" && (
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Profil Employé
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-dept" className="text-xs font-semibold text-slate-700">
                      Département
                    </Label>
                    <Input
                      id="edit-dept"
                      value={editForm.department || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          department: e.target.value,
                        })
                      }
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-pos" className="text-xs font-semibold text-slate-700">
                      Poste / Fonction
                    </Label>
                    <Input
                      id="edit-pos"
                      value={editForm.position || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          position: e.target.value,
                        })
                      }
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-hire" className="text-xs font-semibold text-slate-700">
                    Date d'embauche
                  </Label>
                  <Input
                    id="edit-hire"
                    type="date"
                    value={editForm.hire_date || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        hire_date: e.target.value,
                      })
                    }
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
                onClick={() => setEditingUser(null)}
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

      {/* ── MODAL 3: Reset Password Dialog ──────────────────────── */}
      <Dialog
        open={Boolean(resetPwdUser)}
        onOpenChange={(open) => !open && setResetPwdUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <DialogTitle>Réinitialiser le Mot de passe</DialogTitle>
            </div>
            <DialogDescription>
              Définissez un nouveau mot de passe pour {resetPwdUser?.first_name}{" "}
              {resetPwdUser?.last_name} ({resetPwdUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResetPassword} className="space-y-4 py-2">
            {resetPwdError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{resetPwdError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-pwd" className="text-xs font-semibold text-slate-700">
                Nouveau mot de passe *
              </Label>
              <Input
                id="new-pwd"
                type="password"
                required
                placeholder="Minimum 8 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                className="text-xs h-9"
              />
              <p className="text-[11px] text-slate-400">
                L'utilisateur pourra utiliser ce mot de passe immédiatement pour se connecter.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetPwdUser(null)}
                disabled={isResetting}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isResetting}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Mise à jour…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    Mettre à jour le mot de passe
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
