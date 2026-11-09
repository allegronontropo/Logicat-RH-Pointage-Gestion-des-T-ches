// TypeScript interfaces mirroring backend Pydantic schemas

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "ADMIN_RH" | "EMPLOYEE";
  is_active: boolean;
  phone?: string | null;
  employee_profile?: EmployeeProfile | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface EmployeeProfile {
  id: number;
  user_id?: number;
  department: string | null;
  position: string | null;
  hire_date: string | null;
}

export interface UserDetail extends User {
  department?: string | null;
  position?: string | null;
  hire_date?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface Assignee {
  employee_id: number;
  first_name: string;
  last_name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  due_date: string | null;
  assigned_to: number;
  assignee: Assignee | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface BreakSummary {
  id: number;
  type: "MORNING" | "LUNCH" | "EVENING";
  start_time: string;
  end_time: string | null;
}

export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  department: string | null;
  position: string | null;
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  employee?: EmployeeSummary | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  justification_note: string | null;
  presence_minutes: number;
  break_minutes: number;
  effective_minutes: number;
  breaks: BreakSummary[];
}

export interface AdminDashboard {
  active_employees: number;
  present_today: number;
  absences_today: number;
  total_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
}

export interface EmployeeDashboard {
  status: string;
  effective_minutes: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
}
