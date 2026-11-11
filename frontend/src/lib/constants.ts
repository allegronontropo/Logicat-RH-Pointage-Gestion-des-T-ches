// Application-wide constants

export const ROLES = {
  ADMIN_RH: "ADMIN_RH",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT_JUSTIFIED",
  "ABSENT_UNJUSTIFIED",
] as const;

export const BREAK_TYPES = ["MORNING", "LUNCH", "EVENING"] as const;
export type BreakType = (typeof BREAK_TYPES)[number];

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyen",
  HIGH: "Élevé",
};

export const STATUS_LABELS: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
  PRESENT: "Présent",
  ABSENT_JUSTIFIED: "Absent justifié",
  ABSENT_UNJUSTIFIED: "Absent injustifié",
  NOT_CHECKED_IN: "Non pointé",
};
