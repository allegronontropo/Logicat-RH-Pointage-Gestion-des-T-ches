import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceCalendar } from "@/components/shared/AttendanceCalendar";
import { getUserById } from "@/api/users";
import { listAllAttendance } from "@/api/attendances";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminUserHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthKey = getMonthKey(currentMonth);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getUserById(userId),
    enabled: Number.isInteger(userId) && userId > 0,
  });

  const employeeId = user?.employee_id ?? user?.employee_profile?.id;
  const {
    data: attendances = [],
    isLoading: isAttendanceLoading,
    isError: isAttendanceError,
  } = useQuery({
    queryKey: ["admin-user-history", employeeId, monthKey],
    queryFn: () => listAllAttendance({
      employee_id: employeeId!,
      date_from: `${monthKey}-01`,
      date_to: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
    }),
    enabled: employeeId != null,
  });

  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const followingMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const userName = user ? `${user.first_name} ${user.last_name}` : "Collaborateur";

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={`/admin/users/${id}`}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au profil
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Historique de {userName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">Présences, absences et pauses du mois sélectionné</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(previousMonth)} className="gap-1.5">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mois précédent</span>
          </Button>
          <span className="min-w-32 text-center text-sm font-bold text-slate-800">
            {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(followingMonth)} className="gap-1.5">
            <span className="hidden sm:inline">Mois suivant</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isUserError ? (
        <Card><CardContent className="py-10 text-center text-sm text-rose-600">Impossible de charger le profil de ce collaborateur.</CardContent></Card>
      ) : isUserLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-slate-500">Chargement du profil...</CardContent></Card>
      ) : !employeeId ? (
        <Card><CardContent className="py-10 text-center text-sm text-slate-500">Aucun profil employé n'est associé à cet utilisateur.</CardContent></Card>
      ) : isAttendanceError ? (
        <Card><CardContent className="py-10 text-center text-sm text-rose-600">Impossible de charger l'historique de pointage.</CardContent></Card>
      ) : (
        <AttendanceCalendar
          attendances={attendances}
          currentMonth={currentMonth}
          isLoading={isAttendanceLoading}
        />
      )}
    </div>
  );
}
