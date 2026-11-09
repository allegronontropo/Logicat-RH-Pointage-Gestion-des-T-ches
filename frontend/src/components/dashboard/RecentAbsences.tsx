import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarX,
  ShieldCheck,
  AlertCircle,
  FileText,
  Pencil,
  X,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { justifyAbsence } from "@/api/attendances";
import type { Attendance } from "@/types";

interface RecentAbsencesProps {
  attendances?: Attendance[];
  isLoading?: boolean;
}

export function RecentAbsences({
  attendances = [],
  isLoading = false,
}: RecentAbsencesProps) {
  const queryClient = useQueryClient();

  // Filter only justified or unjustified absences, take 3 most recent
  const absences = attendances
    .filter(
      (a) => a.status === "ABSENT_JUSTIFIED" || a.status === "ABSENT_UNJUSTIFIED"
    )
    .slice(0, 3);

  // Modal state for justification
  const [selectedAbsence, setSelectedAbsence] = useState<Attendance | null>(null);
  const [justificationNote, setJustificationNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function openJustifyModal(item: Attendance) {
    setSelectedAbsence(item);
    setJustificationNote("");
    setSubmitError(null);
  }

  function closeJustifyModal() {
    setSelectedAbsence(null);
    setJustificationNote("");
    setSubmitError(null);
  }

  async function handleConfirmJustify(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAbsence) return;
    if (!justificationNote.trim()) {
      setSubmitError("Veuillez saisir un motif de justification");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await justifyAbsence(selectedAbsence.id, justificationNote.trim());
      // Invalidate queries to refresh attendances and dashboard KPIs instantly
      await queryClient.invalidateQueries({ queryKey: ["admin-attendances"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeJustifyModal();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Erreur lors de la justification";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
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
            Gestion et suivi des motifs d'absence
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

              const initials =
                employeeName
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
                          Non Justifiée
                        </>
                      )}
                    </span>
                  </div>

                  {/* Justification note or Action Button */}
                  <div className="mt-2 pl-10">
                    {isJustified ? (
                      item.justification_note ? (
                        <div className="rounded-md bg-slate-50 border border-slate-100 p-2 text-xs text-slate-600 flex items-start gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span className="italic">
                            « {item.justification_note} »
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Absence justifiée sans note
                        </p>
                      )
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-rose-600 font-medium">
                          Justificatif en attente
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openJustifyModal(item)}
                          className="h-7 px-2.5 text-xs text-primary border-blue-200 hover:bg-blue-50 font-semibold gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          Justifier
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Link to full attendance history */}
          <div className="p-3 text-center bg-slate-50/50 border-t border-slate-100">
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-blue-800 transition"
            >
              <span>Consulter l'historique complet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Justification Modal Dialog ─────────────────────────── */}
      {selectedAbsence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Justifier l'absence
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mise à jour du statut d'absence
                  </p>
                </div>
              </div>
              <button
                onClick={closeJustifyModal}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmJustify} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1">
                <p className="text-slate-500">
                  Employé :{" "}
                  <span className="font-semibold text-slate-800">
                    {selectedAbsence.employee_name ||
                      `Employé #${selectedAbsence.employee_id}`}
                  </span>
                </p>
                <p className="text-slate-500">
                  Date de l'absence :{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDate(selectedAbsence.date)}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="justification"
                  className="text-xs font-semibold text-slate-700"
                >
                  Motif de justification *
                </label>
                <textarea
                  id="justification"
                  rows={3}
                  value={justificationNote}
                  onChange={(e) => setJustificationNote(e.target.value)}
                  placeholder="Ex : Certificat médical déposé, mission externe validée..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                {submitError && (
                  <p className="text-[11px] font-medium text-rose-600">
                    {submitError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeJustifyModal}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-blue-800 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Valider la justification
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
