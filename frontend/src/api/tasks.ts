/**
 * src/api/tasks.ts
 * ----------------
 * Task management API calls.
 */

import { apiClient } from "./client";
import type { Task } from "@/types";

export interface TaskCreatePayload {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  due_date?: string;
  assigned_to: number;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: number;
}

export async function listTasks(params?: {
  assigned_to?: number;
  priority?: string;
  status?: string;
  is_late?: boolean;
}): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>("/api/tasks", { params });
  return data;
}

export async function getMyTasks(params?: {
  priority?: string;
  status?: string;
}): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>("/api/tasks/me", { params });
  return data;
}

export async function getTaskById(id: number): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/api/tasks/${id}`);
  return data;
}

export async function createTask(payload: TaskCreatePayload): Promise<Task> {
  const { data } = await apiClient.post<Task>("/api/tasks/", payload);
  return data;
}

export async function updateTask(id: number, payload: TaskUpdatePayload): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/api/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatus(
  id: number,
  status: "TODO" | "IN_PROGRESS" | "DONE"
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/api/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}
