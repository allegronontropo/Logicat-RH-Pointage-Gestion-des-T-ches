/**
 * src/pages/employee/EmployeeDashboard.tsx
 * -----------------------------------------
 * Employee Dashboard placeholder:
 * - Fetches personal metrics from GET /api/dashboard/employee
 * - Displays today's effective working time and current status
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckSquare,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEmployeeDashboard } from "@/api/dashboard";
import { useAuth } from "@/auth/useAuth";

function formatMinutes(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return "00h 00m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

function renderStatusBadge(status?: string) {
  switch (status) {
    case "PRESENT":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Présent (En service)
        </span>
      );
    case "ABSENT_JUSTIFIED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-700 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Absence Justifiée
        </span>
      );
    case "ABSENT_UNJUSTIFIED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase text-rose-700 border border-rose-200">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Absence Non Justifiée
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Non pointé aujourd'hui
        </span>
      );
  }
}

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard", "employee"],
    queryFn: getEmployeeDashboard,
  });

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Portail Employé LOGICAT
              </span>
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Bonjour, {user?.first_name} !
            </h1>
            <p className="text-xs text-blue-100 max-w-md">
              Bienvenue sur votre espace personnel. Consultez ci-dessous votre temps
              effectif et accédez à vos pointages du jour.
            </p>
          </div>

          <Link to="/employee/attendance">
            <Button
              size="sm"
              className="bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs shadow-sm gap-2 whitespace-nowrap h-10 px-4"
            >
              <Clock className="h-4 w-4 text-blue-700" />
              <span>Accéder au Pointage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Metrics Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Today's Status */}
        <Card className="border border-slate-200/90 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statut du Jour
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement...</span>
              </div>
            ) : isError ? (
              <p className="text-xs text-rose-600 font-medium">
                Impossible de charger le statut
              </p>
            ) : (
              <div className="space-y-3">
                <div>{renderStatusBadge(data?.status)}</div>
                <p className="text-xs text-slate-500">
                  {data?.status === "PRESENT"
                    ? "Votre présence a été enregistrée pour la journée en cours."
                    : data?.status === "NOT_CHECKED_IN"
                    ? "Pensez à pointer votre arrivée dès le début de votre service."
                    : "Statut mis à jour par l'administration RH."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Effective Working Time */}
        <Card className="border border-slate-200/90 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Temps de Travail Effectif
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Calcul du temps...</span>
              </div>
            ) : isError ? (
              <p className="text-xs text-rose-600 font-medium">
                Erreur de récupération
              </p>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                  {formatMinutes(data?.effective_minutes)}
                </div>
                <p className="text-xs text-slate-400">
                  Total calculé aujourd'hui (hors temps de pause)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tasks Overview Placeholder ─────────────────────────── */}
      <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-800">
                Aperçu des Tâches Assignées
              </CardTitle>
            </div>
            <Link
              to="/employee/tasks"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Voir toutes &rarr;
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">À faire</p>
              <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                {data?.todo_tasks ?? "—"}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
              <p className="text-[10px] font-bold uppercase text-blue-600">En cours</p>
              <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">
                {data?.in_progress_tasks ?? "—"}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Terminées</p>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                {data?.done_tasks ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
