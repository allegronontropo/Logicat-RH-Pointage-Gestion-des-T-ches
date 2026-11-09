import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Shield,
  Building,
  Calendar,
  Phone,
  Mail,
  Clock,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Loader2,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  resetPassword,
  type UserUpdatePayload,
} from "@/api/users";
import { listTasks } from "@/api/tasks";
import { listAllAttendance } from "@/api/attendances";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = Number(id);

  // Notifications & Feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
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

  // Reset Password Modal State
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Action loading state
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // 1. Fetch User Detail
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getUserById(userId),
    enabled: !isNaN(userId),
  });

  const employeeId = user?.employee_id;
  const isEmployee = user?.role === "EMPLOYEE";

  // 2. Fetch Tasks (only if employee has an employee_id)
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["admin-user-tasks", employeeId],
    queryFn: () => listTasks({ assigned_to: employeeId! }),
    enabled: Boolean(employeeId),
  });

  // 3. Fetch Attendances (only if employee has an employee_id)
  const { data: attendances = [], isLoading: isAttendancesLoading } = useQuery({
    queryKey: ["admin-user-attendances", employeeId],
    queryFn: () => listAllAttendance({ employee_id: employeeId! }),
    enabled: Boolean(employeeId),
  });

  // Task metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;

  // Recent 5 attendances
  const recentAttendances = attendances.slice(0, 5);

  // ── Open Edit Modal ─────────────────────────────────────────────
  function handleOpenEdit() {
    if (!user) return;
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || "",
      role: user.role,
      department: user.department || "",
      position: user.position || "",
      hire_date: user.hire_date || "",
    });
    setEditError(null);
    setIsEditOpen(true);
  }

  // ── Submit Edit Form ────────────────────────────────────────────
  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
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

      await updateUser(user.id, payload);
      await refetchUser();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsEditOpen(false);
      setFeedback({
        type: "success",
        message: "Les informations de l'utilisateur ont été mises à jour.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la mise à jour.";
      setEditError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsUpdating(false);
    }
  }

  // ── Toggle User Status ──────────────────────────────────────────
  async function handleToggleStatus() {
    if (!user) return;
    setIsTogglingStatus(true);
    setFeedback(null);
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        setFeedback({
          type: "success",
          message: `Le compte de ${user.first_name} ${user.last_name} a été désactivé.`,
        });
      } else {
        await activateUser(user.id);
        setFeedback({
          type: "success",
          message: `Le compte de ${user.first_name} ${user.last_name} a été réactivé.`,
        });
      }
      await refetchUser();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors du changement de statut.";
      setFeedback({
        type: "error",
        message: typeof msg === "string" ? msg : "Opération refusée.",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  }

  // ── Submit Password Reset ───────────────────────────────────────
  async function handleSubmitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setResetPwdError(null);

    if (!newPassword || newPassword.length < 8) {
      setResetPwdError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(user.id, newPassword);
      setFeedback({
        type: "success",
        message: `Mot de passe réinitialisé pour ${user.first_name} ${user.last_name}.`,
      });
      setIsResetPwdOpen(false);
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

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-slate-500 font-medium">
          Chargement du profil utilisateur…
        </p>
      </div>
    );
  }

  if (isUserError || !user) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Utilisateur introuvable
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          L'identifiant #{userId} ne correspond à aucun compte existant ou actif.
        </p>
        <Button
          onClick={() => navigate("/admin/users")}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la liste des utilisateurs
        </Button>
      </div>
    );
  }

  const initials =
    `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/users")}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tous les Utilisateurs</span>
          </Button>

          <div className="hidden sm:block h-4 w-px bg-slate-300" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Passeport Employé</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-800">
              {user.first_name} {user.last_name}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsResetPwdOpen(true);
              setNewPassword("");
              setResetPwdError(null);
            }}
            className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 gap-1.5"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
            <span>Réinitialiser MDP</span>
          </Button>

          <Button
            onClick={handleOpenEdit}
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-blue-800 text-white gap-1.5 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Modifier</span>
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

      {/* ── Two-Column Main Layout Grid ────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Left Column: Identity & Passport (4 or 5 cols) ───── */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            {/* Header Cover Banner */}
            <div className="h-24 bg-gradient-to-r from-blue-700 via-indigo-600 to-primary relative" />

            <CardContent className="pt-0 pb-6 px-6 relative">
              {/* Floating Avatar & Status */}
              <div className="flex items-end justify-between -mt-12 mb-4">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg ring-4 ring-white ${
                    user.role === "ADMIN_RH"
                      ? "bg-gradient-to-tr from-indigo-600 to-blue-700"
                      : "bg-gradient-to-tr from-blue-600 to-cyan-600"
                  }`}
                >
                  {initials}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Compte Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200/80">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Désactivé
                    </span>
                  )}
                </div>
              </div>

              {/* Identity & Basic Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {user.first_name} {user.last_name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  {user.position ||
                    (user.role === "ADMIN_RH"
                      ? "Administrateur RH & Gestion du personnel"
                      : "Collaborateur LOGICAT")}
                </p>
              </div>

              {/* Role & Dept Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                {user.role === "ADMIN_RH" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/70">
                    <Shield className="h-3.5 w-3.5" />
                    Administrateur RH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary border border-blue-200/70">
                    <Users className="h-3.5 w-3.5" />
                    Employé
                  </span>
                )}

                {user.department && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {user.department}
                  </span>
                )}

                {user.employee_id && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-semibold text-slate-600 border border-slate-200">
                    ID : #{user.employee_id}
                  </span>
                )}
              </div>

              {/* Passport Contact Information */}
              <div className="space-y-3 mt-6 pt-5 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Coordonnées & Accès
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-slate-400">
                        Email professionnel
                      </p>
                      <p className="font-semibold text-slate-800 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-slate-400">
                        Numéro de téléphone
                      </p>
                      <p className="font-semibold text-slate-800">
                        {user.phone || "Non renseigné"}
                      </p>
                    </div>
                  </div>

                  {user.hire_date && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-400">
                          Date d'embauche
                        </p>
                        <p className="font-semibold text-slate-800">
                          {formatDate(user.hire_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (Passport Bottom) */}
              <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100">
                <Button
                  onClick={handleOpenEdit}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Modifier
                </Button>

                <Button
                  onClick={handleToggleStatus}
                  variant={user.is_active ? "outline" : "default"}
                  size="sm"
                  disabled={isTogglingStatus}
                  className={`flex-1 text-xs font-semibold ${
                    user.is_active
                      ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isTogglingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : user.is_active ? (
                    <>
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Activer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Activity Snapshot (7 or 8 cols) ──── */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">
          {!isEmployee ? (
            <Card className="border border-slate-200/90 bg-white shadow-sm p-8 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                <Shield className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Compte Administrateur RH
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Cet utilisateur dispose des droits d'administration de la
                plateforme RH. Les fiches de pointage, présences et attributions
                de tâches concernent exclusivement les comptes avec le rôle
                Employé.
              </p>
            </Card>
          ) : (
            <>
              {/* 1. Tasks Summary Widget */}
              <Card className="border border-slate-200/90 bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Synthèse des Tâches Assignées
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vue synthétique du travail confié à ce collaborateur
                    </p>
                  </div>
                  <Link
                    to="/admin/tasks"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition"
                  >
                    <span>Gérer les tâches</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardHeader>

                <CardContent className="pt-5 pb-5">
                  {/* Task Metric Mini-Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Total Tâches
                        </span>
                        <CheckSquare className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">
                        {isTasksLoading ? "…" : totalTasks}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-700">
                          En cours
                        </span>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-xl font-extrabold text-amber-800 mt-1">
                        {isTasksLoading ? "…" : inProgressTasks}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Terminées
                        </span>
                        <Clock className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-xl font-extrabold text-emerald-800 mt-1">
                        {isTasksLoading ? "…" : doneTasks}
                      </p>
                    </div>
                  </div>

                  {/* Task Mini-List */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 mb-2.5">
                      Dernières tâches assignées :
                    </p>

                    {isTasksLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-10 bg-slate-50 rounded-lg animate-pulse"
                          />
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Aucune tâche assignée à ce collaborateur pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasks.slice(0, 3).map((task) => {
                          const statusBg =
                            task.status === "DONE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : task.status === "IN_PROGRESS"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200";

                          const priorityClass =
                            task.priority === "HIGH"
                              ? "text-rose-600 bg-rose-50 border-rose-200"
                              : task.priority === "MEDIUM"
                              ? "text-blue-600 bg-blue-50 border-blue-200"
                              : "text-slate-500 bg-slate-50 border-slate-200";

                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {task.title}
                                </p>
                                {task.due_date && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Échéance : {formatDate(task.due_date)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${priorityClass}`}
                                >
                                  {task.priority}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBg}`}
                                >
                                  {task.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Attendance History Mini-Table */}
              <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Historique Récent des Pointages
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Les 5 dernières journées de travail enregistrées
                    </p>
                  </div>
                  <Link
                    to="/admin/attendance"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition"
                  >
                    <span>Voir tout dans Pointages</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardHeader>

                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/60">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Départ</TableHead>
                        <TableHead>Durée Effectif</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isAttendancesLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i} className="animate-pulse">
                            <TableCell>
                              <div className="h-3 w-20 bg-slate-100 rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-3 w-16 bg-slate-100 rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-3 w-16 bg-slate-100 rounded" />
                            </TableCell>
                            <TableCell>
                              <div className="h-3 w-14 bg-slate-100 rounded" />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="h-5 w-16 bg-slate-100 rounded-full ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : recentAttendances.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-8 text-slate-400 text-xs italic"
                          >
                            Aucun enregistrement de pointage pour ce collaborateur.
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentAttendances.map((item) => {
                          const hours = Math.floor(item.effective_minutes / 60);
                          const mins = item.effective_minutes % 60;
                          const effectiveStr =
                            item.effective_minutes > 0
                              ? `${hours}h ${mins.toString().padStart(2, "0")}m`
                              : "—";

                          const statusBadge =
                            item.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.status === "ABSENT_JUSTIFIED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200";

                          const statusLabel =
                            item.status === "PRESENT"
                              ? item.check_out
                                ? "SORTIE"
                                : "PRÉSENT"
                              : item.status === "ABSENT_JUSTIFIED"
                              ? "ABSENCE JUSTIFIÉE"
                              : "ABSENCE NON JUSTIFIÉE";

                          return (
                            <TableRow key={item.id} className="hover:bg-slate-50/70">
                              <TableCell className="font-semibold text-slate-800">
                                {formatDate(item.date)}
                              </TableCell>
                              <TableCell className="font-mono text-slate-600">
                                {item.check_in
                                  ? formatDateTime(item.check_in)
                                  : "—"}
                              </TableCell>
                              <TableCell className="font-mono text-slate-600">
                                {item.check_out
                                  ? formatDateTime(item.check_out)
                                  : "—"}
                              </TableCell>
                              <TableCell className="font-mono text-slate-700 font-medium">
                                {effectiveStr}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBadge}`}
                                >
                                  {statusLabel}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── MODAL 1: Edit User Dialog ───────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <Pencil className="h-4 w-4" />
              </div>
              <DialogTitle>Modifier le Profil</DialogTitle>
            </div>
            <DialogDescription>
              Mettez à jour les informations de {user.first_name} {user.last_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-2">
            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

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
                onClick={() => setIsEditOpen(false)}
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

      {/* ── MODAL 2: Reset Password Dialog ──────────────────────── */}
      <Dialog open={isResetPwdOpen} onOpenChange={setIsResetPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <DialogTitle>Réinitialiser le Mot de passe</DialogTitle>
            </div>
            <DialogDescription>
              Définissez un nouveau mot de passe pour {user.first_name}{" "}
              {user.last_name} ({user.email}).
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
              <Label htmlFor="detail-pwd" className="text-xs font-semibold text-slate-700">
                Nouveau mot de passe *
              </Label>
              <Input
                id="detail-pwd"
                type="password"
                required
                placeholder="Minimum 8 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetPwdOpen(false)}
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
