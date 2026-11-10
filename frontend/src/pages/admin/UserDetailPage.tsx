import { useState, useMemo } from "react";
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
  Download,
  Plus,
  PieChart as PieChartIcon,
  Trash2,
  RotateCw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  deleteUser,
  listUsers,
  type UserUpdatePayload,
} from "@/api/users";
import { listTasks, createTask, type TaskCreatePayload } from "@/api/tasks";
import { listAllAttendance } from "@/api/attendances";
import { apiClient } from "@/api/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/auth/useAuth";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
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

  // Delete user modal state
  const [deletingUser, setDeletingUser] = useState<UserDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [needsReassign, setNeedsReassign] = useState(false);

  // Export CSV State
  const [isExporting, setIsExporting] = useState(false);

  // Quick Assign Task State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState<TaskCreatePayload>({
    title: "",
    description: "",
    priority: "MEDIUM",
    due_date: "",
    assigned_to: 0,
  });
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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
  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
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

  // 4. Fetch all employees for task assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "EMPLOYEE"],
    queryFn: () => listUsers({ role: "EMPLOYEE" }),
    enabled: isEmployee,
  });

  // Task metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;

  // Recent 5 attendances
  const recentAttendances = attendances.slice(0, 5);

  // Time Breakdown Calculation
  const timeBreakdown = useMemo(() => {
    let totalEffective = 0;
    let totalLunch = 0;
    let totalMorningAfternoon = 0;

    attendances.forEach((att) => {
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

    const total = totalEffective + totalLunch + totalMorningAfternoon;

    const formatMins = (m: number) => {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return `${h}h ${rem < 10 ? "0" : ""}${rem}m`;
    };

    if (total === 0) {
      return [
        {
          name: "Travail Effectif",
          value: 80,
          displayValue: "80%",
          durationText: "80% (estimation)",
          color: "#10b981",
        },
        {
          name: "Pause Déjeuner",
          value: 15,
          displayValue: "15%",
          durationText: "15% (estimation)",
          color: "#f59e0b",
        },
        {
          name: "Pauses Matin/Soir",
          value: 5,
          displayValue: "5%",
          durationText: "5% (estimation)",
          color: "#3b82f6",
        },
      ];
    }

    const effPercent = Math.max(1, Math.round((totalEffective / total) * 100));
    const lunchPercent = Math.round((totalLunch / total) * 100);
    const otherPercent = Math.max(0, 100 - effPercent - lunchPercent);

    return [
      {
        name: "Travail Effectif",
        value: effPercent,
        displayValue: `${effPercent}% (${formatMins(totalEffective)})`,
        durationText: formatMins(totalEffective),
        color: "#10b981",
      },
      {
        name: "Pause Déjeuner",
        value: lunchPercent,
        displayValue: `${lunchPercent}% (${formatMins(totalLunch)})`,
        durationText: formatMins(totalLunch),
        color: "#f59e0b",
      },
      {
        name: "Pauses Matin/Soir",
        value: otherPercent,
        displayValue: `${otherPercent}% (${formatMins(totalMorningAfternoon)})`,
        durationText: formatMins(totalMorningAfternoon),
        color: "#3b82f6",
      },
    ];
  }, [attendances]);

  // ── CSV Download Logic ───────────────────────────────────────────
  async function handleExportCSV() {
    const targetId = employeeId || user?.employee_id || userId;
    if (!targetId) return;

    setIsExporting(true);
    try {
      const response = await apiClient.get(
        `/api/attendances/export/${targetId}`,
        {
          responseType: "blob",
        }
      );
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = `${user?.first_name || "employe"}_${user?.last_name || targetId}`
        .toLowerCase()
        .replace(/\s+/g, "_");
      link.setAttribute("download", `attendance_${safeName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setFeedback({
        type: "success",
        message: "Fichier CSV des pointages téléchargé avec succès.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: "Erreur lors de l'exportation du fichier CSV.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  // ── Open Quick Task Creation ─────────────────────────────────────
  function handleOpenCreateTask() {
    const targetEmpId = employeeId || user?.employee_id || userId || 0;
    setCreateTaskForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      due_date: "",
      assigned_to: targetEmpId,
    });
    setCreateTaskError(null);
    setIsCreateTaskOpen(true);
  }

  // ── Submit Quick Task Creation ───────────────────────────────────
  async function handleSubmitCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!createTaskForm.title.trim()) {
      setCreateTaskError("Le titre de la tâche est obligatoire.");
      return;
    }
    if (!createTaskForm.assigned_to) {
      setCreateTaskError("Veuillez sélectionner un collaborateur.");
      return;
    }

    setIsCreatingTask(true);
    setCreateTaskError(null);
    try {
      await createTask({
        title: createTaskForm.title.trim(),
        description: createTaskForm.description?.trim() || undefined,
        priority: createTaskForm.priority,
        due_date: createTaskForm.due_date || undefined,
        assigned_to: Number(createTaskForm.assigned_to),
      });

      await refetchTasks();
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      setFeedback({
        type: "success",
        message: `La tâche « ${createTaskForm.title} » a été assignée avec succès à ${user?.first_name} ${user?.last_name}.`,
      });
      setIsCreateTaskOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la création de la tâche.";
      setCreateTaskError(typeof msg === "string" ? msg : "Opération refusée.");
    } finally {
      setIsCreatingTask(false);
    }
  }

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
      setIsTogglingStatus(false);
    }
  }

  // ── Open Delete Confirmation ────────────────────────────────────
  function handleOpenDelete() {
    if (!user) return;
    setDeleteError(null);
    setNeedsReassign(false);
    setDeletingUser(user);
  }

  // ── Redirect to the Tasks page filtered on the blocking employee ─
  async function handleGoReassign() {
    if (!deletingUser) return;

    // Fetch the user detail to reliably get the employee profile id.
    // Task.assigned_to references employees.id, not users.id, so we must
    // pass the employee id to avoid landing on another user's tasks.
    try {
      const detail = await getUserById(deletingUser.id);
      const employeeId =
        detail.employee_profile?.id ??
        detail.employee_id ??
        deletingUser.id;

      setDeletingUser(null);
      setDeleteError(null);
      setNeedsReassign(false);
      navigate(`/admin/tasks?assigned_to=${employeeId}`);
    } catch {
      setDeletingUser(null);
      setDeleteError(null);
      setNeedsReassign(false);
      navigate(`/admin/tasks?assigned_to=${deletingUser.id}`);
    }
  }

  // ── Confirm Hard Delete ─────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deletingUser) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(deletingUser.id);
      await refetchUser();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["attendances"] });
      setFeedback({
        type: "success",
        message: `L'utilisateur ${deletingUser.first_name} ${deletingUser.last_name} a été supprimé définitivement.`,
      });
      setDeletingUser(null);
      navigate("/admin/users");
    } catch (err: unknown) {
      const status = (
        err as { response?: { status?: number; data?: { detail?: string } } }
      )?.response?.status;
      const detail = (
        err as { response?: { data?: { detail?: string } } }
      )?.response?.data?.detail;

      if (status === 409) {
        // Blocked by assigned tasks: offer the reassignment shortcut.
        setNeedsReassign(true);
        setDeleteError(
          "Impossible de supprimer : cet employé a des tâches assignées. Veuillez les réassigner d'abord."
        );
      } else {
        setDeleteError(
          typeof detail === "string" ? detail : "Erreur lors de la suppression."
        );
      }
    } finally {
      setIsDeleting(false);
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
        <div className="flex flex-wrap items-center gap-2">
          {isEmployee && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 gap-1.5 shadow-2xs"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span>Exporter CSV</span>
              </Button>

              <Button
                onClick={handleOpenCreateTask}
                size="sm"
                className="h-9 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assigner une tâche</span>
              </Button>
            </>
          )}

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
              <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-5 border-t border-slate-100">
                {/* Modifier — Primary */}
                <Button
                  onClick={handleOpenEdit}
                  variant="default"
                  size="sm"
                  className="h-9 flex-1 text-xs font-semibold text-white bg-primary hover:bg-blue-800"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1 text-white" />
                  Modifier
                </Button>

                {/* Désactiver / Activer — Outline */}
                <Button
                  onClick={handleToggleStatus}
                  variant="outline"
                  size="sm"
                  disabled={isTogglingStatus || user.id === currentUser?.id}
                  title={
                    user.id === currentUser?.id
                      ? "Vous ne pouvez pas désactiver votre propre compte."
                      : undefined
                  }
                  className={`h-9 flex-1 text-xs font-semibold ${
                    user.is_active
                      ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                      : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {isTogglingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : user.is_active ? (
                    <>
                      <UserX className="h-3.5 w-3.5 mr-1 text-rose-600" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Activer
                    </>
                  )}
                </Button>

                {/* Supprimer — Outline, red */}
                {user && user.id !== currentUser?.id && (
                  <Button
                    onClick={handleOpenDelete}
                    disabled={isDeleting}
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-600" />
                    Supprimer
                  </Button>
                )}
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
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleOpenCreateTask}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assigner</span>
                    </Button>
                    <Link
                      to="/admin/tasks"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition"
                    >
                      <span>Gérer</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
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

              {/* 2. Visual Time Breakdown (Recharts Donut) */}
              <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <PieChartIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        Répartition du temps
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ventilation entre travail effectif et temps de pause
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Exporter CSV</span>
                  </Button>
                </CardHeader>

                <CardContent className="pt-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Donut Chart */}
                    <div className="md:col-span-6 flex items-center justify-center h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={timeBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {timeBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any, item: any) => [
                              item.payload.displayValue || `${value}%`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              color: "#fff",
                              borderRadius: "8px",
                              fontSize: "12px",
                              border: "none",
                              padding: "8px 12px",
                            }}
                            itemStyle={{ color: "#fff" }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={32}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Time Breakdown Metrics Details */}
                    <div className="md:col-span-6 space-y-2.5">
                      {timeBreakdown.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs font-semibold text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {item.value}%
                            </span>
                            {item.durationText && (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {item.durationText}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Attendance History Mini-Table */}
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
                  disabled={user?.id === currentUser?.id}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as "ADMIN_RH" | "EMPLOYEE",
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="EMPLOYEE">Employé</option>
                  <option value="ADMIN_RH">Admin RH</option>
                </select>
                {user?.id === currentUser?.id && (
                  <p className="text-[10px] text-slate-400">
                    Vous ne pouvez pas modifier votre propre rôle.
                  </p>
                )}
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

      {/* ── MODAL 3: Quick Assign Task Dialog ──────────────────── */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckSquare className="h-4 w-4" />
              </div>
              <DialogTitle>Assigner une Tâche</DialogTitle>
            </div>
            <DialogDescription>
              Créez et assignez une mission directement à{" "}
              <span className="font-semibold text-slate-800">
                {user.first_name} {user.last_name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreateTask} className="space-y-4 py-2">
            {createTaskError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{createTaskError}</span>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-1.5">
              <Label
                htmlFor="passport-task-title"
                className="text-xs font-semibold text-slate-700"
              >
                Titre de la tâche *
              </Label>
              <Input
                id="passport-task-title"
                required
                placeholder="ex. Réviser la documentation technique..."
                value={createTaskForm.title}
                onChange={(e) =>
                  setCreateTaskForm({ ...createTaskForm, title: e.target.value })
                }
                autoFocus
                className="text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="passport-task-desc"
                className="text-xs font-semibold text-slate-700"
              >
                Description détaillée
              </Label>
              <textarea
                id="passport-task-desc"
                rows={3}
                placeholder="Précisez les consignes, les livrables attendus..."
                value={createTaskForm.description || ""}
                onChange={(e) =>
                  setCreateTaskForm({
                    ...createTaskForm,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Assignee & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="passport-task-assignee"
                  className="text-xs font-semibold text-slate-700"
                >
                  Assigné à *
                </Label>
                <select
                  id="passport-task-assignee"
                  required
                  value={createTaskForm.assigned_to}
                  onChange={(e) =>
                    setCreateTaskForm({
                      ...createTaskForm,
                      assigned_to: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                >
                  {/* Current user pre-filled */}
                  {user && (
                    <option value={employeeId || user.employee_id || user.id}>
                      {user.first_name} {user.last_name}{" "}
                      {user.department ? `(${user.department})` : ""} [Cet employé]
                    </option>
                  )}
                  {allUsers
                    .filter(
                      (u) =>
                        (u.employee_id || u.id) !==
                        (employeeId || user?.employee_id || user?.id)
                    )
                    .map((emp) => {
                      const empId = emp.employee_id || emp.id;
                      return (
                        <option key={emp.id} value={empId}>
                          {emp.first_name} {emp.last_name}{" "}
                          {emp.department ? `(${emp.department})` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="passport-task-prio"
                  className="text-xs font-semibold text-slate-700"
                >
                  Priorité *
                </Label>
                <select
                  id="passport-task-prio"
                  value={createTaskForm.priority}
                  onChange={(e) =>
                    setCreateTaskForm({
                      ...createTaskForm,
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
              <Label
                htmlFor="passport-task-due"
                className="text-xs font-semibold text-slate-700"
              >
                Date d'échéance
              </Label>
              <Input
                id="passport-task-due"
                type="date"
                value={createTaskForm.due_date || ""}
                onChange={(e) =>
                  setCreateTaskForm({
                    ...createTaskForm,
                    due_date: e.target.value,
                  })
                }
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateTaskOpen(false)}
                disabled={isCreatingTask}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingTask}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Attribution en cours…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Assigner la tâche
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: Delete User Confirmation ─────────────────────── */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletingUser(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingUser && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-bold text-slate-900">
                {deletingUser.first_name} {deletingUser.last_name}
              </p>
              <p className="text-slate-500 mt-0.5">{deletingUser.email}</p>
            </div>
          )}

          {deleteError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || needsReassign}>
              Annuler
            </AlertDialogCancel>
            {needsReassign ? (
              <Button
                onClick={handleGoReassign}
                disabled={isDeleting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Réassigner les tâches
              </Button>
            ) : (
              <Button
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
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
