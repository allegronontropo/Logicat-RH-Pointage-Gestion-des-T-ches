/**
 * src/api/auth.ts
 * ---------------
 * Authentication API calls.
 */

import { apiClient } from "./client";
import type { TokenResponse, User } from "@/types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/api/auth/me", {
    headers: { "Cache-Control": "no-cache, no-store", Pragma: "no-cache" },
  });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout").catch(() => {
    // Server logout is a no-op; ignore errors
  });
}
