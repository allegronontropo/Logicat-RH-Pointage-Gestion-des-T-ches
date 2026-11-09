import { useState } from "react";
import { Check, X, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ApprovalRequest {
  id: string;
  employeeName: string;
  initials: string;
  avatarBg: string;
  type: string;
  details: string;
  submittedAt: string;
  status: "pending" | "approved" | "denied";
}

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "req-1",
    employeeName: "Youssef Badri",
    initials: "YB",
    avatarBg: "bg-blue-100 text-blue-700",
    type: "Absence Justifiée",
    details: "Rendez-vous médical (12 Nov)",
    submittedAt: "Il y a 25m",
    status: "pending",
  },
  {
    id: "req-2",
    employeeName: "Sara Bennani",
    initials: "SB",
    avatarBg: "bg-emerald-100 text-emerald-700",
    type: "Pause Dépassée (+15m)",
    details: "Assistance client urgence",
    submittedAt: "Il y a 1h",
    status: "pending",
  },
  {
    id: "req-3",
    employeeName: "Karim Alami",
    initials: "KA",
    avatarBg: "bg-purple-100 text-purple-700",
    type: "Validation Tâche",
    details: "Audit sécurité Q3 terminé",
    submittedAt: "Il y a 3h",
    status: "pending",
  },
];

export function PendingApprovals() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  function updateStatus(id: string, newStatus: "approved" | "denied") {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  }

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Pending Approvals
            </CardTitle>
            {pendingCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm">
                {pendingCount}
              </span>
            )}
          </div>
          <AlertCircle className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">
          Demandes d'absence et régularisations
        </p>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Aucune demande en attente.
          </div>
        ) : (
          requests.map((item) => (
            <div
              key={item.id}
              className="p-3.5 transition-colors hover:bg-slate-50/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.avatarBg}`}
                  >
                    {item.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {item.employeeName}
                    </p>
                    <p className="text-[11px] font-medium text-primary">
                      {item.type}
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <Clock className="h-2.5 w-2.5" />
                  {item.submittedAt}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-600 pl-10">
                {item.details}
              </p>

              {/* Action buttons or status indicator */}
              <div className="mt-2.5 flex items-center justify-end gap-2 pl-10">
                {item.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(item.id, "denied")}
                      className="h-7 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(item.id, "approved")}
                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Approuver
                    </Button>
                  </>
                ) : item.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Check className="h-3 w-3" />
                    Approuvé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    <X className="h-3 w-3" />
                    Refusé
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
