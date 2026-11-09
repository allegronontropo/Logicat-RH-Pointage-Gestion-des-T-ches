import { CalendarX, ShieldCheck, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Attendance } from "@/types";

interface RecentAbsencesProps {
  attendances?: Attendance[];
  isLoading?: boolean;
}

export function RecentAbsences({ attendances = [], isLoading = false }: RecentAbsencesProps) {
  // Filter only justified or unjustified absences
  const absences = attendances.filter(
    (a) => a.status === "ABSENT_JUSTIFIED" || a.status === "ABSENT_UNJUSTIFIED"
  );

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Absences Récentes
            </CardTitle>
            {absences.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {absences.length}
              </span>
            )}
          </div>
          <AlertCircle className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">
          Absences déclarées par la direction RH
        </p>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-2.5 w-40 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : absences.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-2">
              <CalendarX className="h-5 w-5 stroke-[1.8]" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Aucune absence enregistrée
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
              Toutes les présences sont normales ou aucune absence n'a été déclarée.
            </p>
          </div>
        ) : (
          absences.map((item) => {
            const isJustified = item.status === "ABSENT_JUSTIFIED";
            const employeeName =
              item.employee_name ||
              (item.employee
                ? `${item.employee.first_name} ${item.employee.last_name}`
                : `Employé #${item.employee_id}`);

            const initials = employeeName
              .split(" ")
              .filter(Boolean)
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "EM";

            return (
              <div
                key={item.id}
                className="p-3.5 transition-colors hover:bg-slate-50/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isJustified
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {employeeName}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400">
                        Date: {formatDate(item.date)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${
                      isJustified
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {isJustified ? (
                      <>
                        <ShieldCheck className="h-3 w-3" />
                        Justifiée
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Injustifiée
                      </>
                    )}
                  </span>
                </div>

                {/* Justification Note */}
                <div className="mt-2 pl-10">
                  {item.justification_note ? (
                    <div className="rounded-md bg-slate-50 border border-slate-100 p-2 text-xs text-slate-600 flex items-start gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="italic">
                        « {item.justification_note} »
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Aucun motif renseigné
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
