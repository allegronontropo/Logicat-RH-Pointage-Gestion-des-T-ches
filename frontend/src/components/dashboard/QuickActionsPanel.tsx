import { useState } from "react";
import { UserPlus, PlusCircle, CalendarX, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuickActionsPanelProps {
  onAddEmployee?: () => void;
  onAssignTask?: () => void;
}

export function QuickActionsPanel({ onAddEmployee, onAssignTask }: QuickActionsPanelProps = {}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleAction(name: string, url: string) {
    setFeedback(`Action: ${name}`);
    setTimeout(() => {
      window.location.href = url;
    }, 400);
  }

  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Quick Actions
          </CardTitle>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-xs text-slate-500">
          Raccourcis administratifs fréquents
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {feedback && (
          <div className="rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700 animate-fadeIn">
            {feedback}
          </div>
        )}

        {/* Primary Action: Add Employee */}
        <Button
          onClick={() => {
            if (onAddEmployee) {
              onAddEmployee();
            } else {
              handleAction("Ajout Employé", "/admin/users");
            }
          }}
          className="w-full justify-start gap-2.5 bg-primary hover:bg-blue-800 text-white font-medium shadow-sm transition-all h-10"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
            <UserPlus className="h-3.5 w-3.5 text-white" />
          </div>
          <span>Add New Employee</span>
        </Button>

        {/* Secondary Action: Assign Task */}
        <Button
          onClick={() => {
            if (onAssignTask) {
              onAssignTask();
            } else {
              handleAction("Nouvelle Tâche", "/admin/tasks");
            }
          }}
          variant="outline"
          className="w-full justify-start gap-2.5 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium h-10 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <PlusCircle className="h-3.5 w-3.5" />
          </div>
          <span>Assign New Task</span>
        </Button>

        {/* Tertiary Action: Declare Absence */}
        <Button
          onClick={() => handleAction("Déclarer Absence", "/admin/attendance")}
          variant="ghost"
          className="w-full justify-start gap-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 transition-colors text-xs font-semibold"
        >
          <CalendarX className="h-3.5 w-3.5 text-amber-500" />
          <span>Déclarer une Absence</span>
        </Button>

        <Button
          onClick={() => handleAction("Exporter Rapport", "/admin/attendance")}
          variant="ghost"
          className="w-full justify-start gap-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 transition-colors text-xs font-semibold"
        >
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>Exporter rapport mensuel</span>
        </Button>
      </CardContent>
    </Card>
  );
}
