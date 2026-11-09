/**
 * src/api/dashboard.ts
 * --------------------
 * Dashboard API calls.
 */

import { apiClient } from "./client";
import type { AdminDashboard, EmployeeDashboard } from "@/types";

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await apiClient.get<AdminDashboard>("/api/dashboard/admin");
  return data;
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboard> {
  const { data } = await apiClient.get<EmployeeDashboard>("/api/dashboard/employee");
  return data;
}
