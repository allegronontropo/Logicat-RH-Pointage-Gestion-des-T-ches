/**
 * src/api/dashboard.ts
 * --------------------
 * Dashboard API calls.
 */

import { apiClient } from "./client";
import type { AdminDashboard, EmployeeDashboard } from "@/types";

export interface TrendPoint {
  date: string;
  present_count: number;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await apiClient.get<AdminDashboard>("/api/dashboard/admin");
  return data;
}

export async function getAttendanceTrends(): Promise<TrendPoint[]> {
  const { data } = await apiClient.get<TrendPoint[]>("/api/dashboard/trends");
  return data;
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboard> {
  const { data } = await apiClient.get<EmployeeDashboard>("/api/dashboard/employee");
  return data;
}
