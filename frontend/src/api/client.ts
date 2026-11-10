/**
 * src/api/client.ts
 * -----------------
 * Axios instance with base URL and auth error interceptors.
 * On 401: clears localStorage token and redirects to /login.
 * On 403 while on an /admin page: the token role no longer matches the DB role
 * (e.g. the account was demoted), so clear the session and redirect to /login.
 */

import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401, clear token and redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      // Hard redirect — works outside React context too
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else if (error.response?.status === 403) {
      // A 403 on an admin page means the JWT role no longer matches the
      // database role (e.g. the account was demoted). Keeping the stale
      // token would leave the admin UI in a broken state — log out instead.
      if (window.location.pathname.startsWith("/admin")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
