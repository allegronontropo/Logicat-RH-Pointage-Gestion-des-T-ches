/**
 * src/api/users.ts
 * ----------------
 * User management API calls (Admin only).
 */

import { apiClient } from "./client";
import type { UserDetail } from "@/types";

export interface UserCreatePayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "ADMIN_RH" | "EMPLOYEE";
  department?: string;
  position?: string;
  hire_date?: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active?: boolean;
}

export async function listUsers(params?: {
  q?: string;
  role?: string;
  is_active?: boolean;
  department?: string;
}): Promise<UserDetail[]> {
  const { data } = await apiClient.get<UserDetail[]>("/api/users", { params });
  return data;
}

export async function getUserById(id: number): Promise<UserDetail> {
  const { data } = await apiClient.get<UserDetail>(`/api/users/${id}`);
  return data;
}

export async function createUser(payload: UserCreatePayload): Promise<UserDetail> {
  const { data } = await apiClient.post<UserDetail>("/api/users", payload);
  return data;
}

export async function updateUser(id: number, payload: UserUpdatePayload): Promise<UserDetail> {
  const { data } = await apiClient.put<UserDetail>(`/api/users/${id}`, payload);
  return data;
}

export async function deactivateUser(id: number): Promise<{ detail: string }> {
  const { data } = await apiClient.patch<{ detail: string }>(`/api/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: number): Promise<UserDetail> {
  const { data } = await apiClient.patch<UserDetail>(`/api/users/${id}/activate`);
  return data;
}

export async function resetPassword(id: number, newPassword: string): Promise<UserDetail> {
  const { data } = await apiClient.patch<UserDetail>(
    `/api/users/${id}/reset-password`,
    { new_password: newPassword },
    { params: { new_password: newPassword } }
  );
  return data;
}
