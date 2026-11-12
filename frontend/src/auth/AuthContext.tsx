/**
 * src/auth/AuthContext.tsx
 * ------------------------
 * Auth context: JWT stored in localStorage + React state.
 * Provides login() and logout() to the whole app.
 */

import React, { createContext, useCallback, useEffect, useState } from "react";
import { getMe as apiGetMe, login as apiLogin, logout as apiLogout } from "@/api/auth";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );

  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await apiLogin(email, password);
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
      setToken(response.access_token);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  // Revalidate the cached user on app startup, login, and when returning to the tab
  // so profile changes made during an existing session appear without re-login.
  useEffect(() => {
    if (!token) return;

    let active = true;
    const refreshCurrentUser = async () => {
      try {
        const currentUser = await apiGetMe();
        if (active) updateUser(currentUser);
      } catch {
        // Keep the cached user available during temporary network failures.
      }
    };

    void refreshCurrentUser();
    window.addEventListener("focus", refreshCurrentUser);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshCurrentUser);
    };
  }, [token, updateUser]);

  // Sync state if localStorage changes (e.g., 401 interceptor clears it)
  useEffect(() => {
    const handleStorage = () => {
      const storedToken = localStorage.getItem("access_token");
      if (!storedToken) {
        setToken(null);
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
