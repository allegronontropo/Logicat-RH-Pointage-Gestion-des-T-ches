/**
 * src/api/attendances.ts
 * ----------------------
 * Attendance API calls.
 */

import { apiClient } from "./client";
import type { Attendance } from "@/types";

export async function checkIn(): Promise<Attendance> {
  const { data } = await apiClient.post<Attendance>("/api/attendances/check-in");
  return data;
}

export async function checkOut(): Promise<Attendance> {
  const { data } = await apiClient.post<Attendance>("/api/attendances/check-out");
  return data;
}

export async function getTodayAttendance(): Promise<Attendance> {
  const { data } = await apiClient.get<Attendance>("/api/attendances/today");
  return data;
}

export async function getMyAttendance(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<Attendance[]> {
  const { data } = await apiClient.get<Attendance[]>("/api/attendances/me", { params });
  return data;
}

export async function listAllAttendance(params?: {
  employee_id?: number;
  date?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Attendance[]> {
  const { data } = await apiClient.get<Attendance[]>("/api/attendances", { params });
  return data;
}

export async function declareAbsence(payload: {
  employee_id: number;
  start_date: string;
  end_date: string;
  status: "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED";
  justification_note?: string;
  override?: boolean;
}): Promise<Attendance[]> {
  const { data } = await apiClient.post<Attendance[]>("/api/attendances/absences", payload);
  return data;
}

export async function overrideAttendanceStatus(
  attendanceId: number,
  payload: {
    status: string;
    justification_note?: string;
  }
): Promise<Attendance> {
  const { data } = await apiClient.patch<Attendance>(
    `/api/attendances/${attendanceId}/status`,
    payload
  );
  return data;
}

export async function justifyAbsence(
  attendanceId: number,
  justificationNote: string
): Promise<Attendance> {
  const { data } = await apiClient.patch<Attendance>(
    `/api/attendances/${attendanceId}/justify`,
    { justification_note: justificationNote }
  );
  return data;
}

export async function startBreak(type: "MORNING" | "LUNCH" | "EVENING"): Promise<unknown> {
  const { data } = await apiClient.post("/api/breaks/start", { type });
  return data;
}

export async function endBreak(breakId: number): Promise<unknown> {
  const { data } = await apiClient.post(`/api/breaks/${breakId}/end`);
  return data;
}
