"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setupDone = useRef(false);

  useEffect(() => {
    if (setupDone.current) return;
    setupDone.current = true;

    // Axios Interceptor for globally catching 401s and handling token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If the error is 401 Unauthorized, and we haven't already tried retrying this exact request
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const authStore = useAuthStore.getState();
          const refreshed = await authStore.refreshTokens();

          if (refreshed) {
            // Update the failed request's Authorization header with the fresh token
            const newToken = useAuthStore.getState().token;
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            // Re-run the failed request automatically
            return axios(originalRequest);
          } else {
            // Refresh failed (cookie expired), force logout
            authStore.logout();
            router.push("/");
          }
        }

        return Promise.reject(error);
      }
    );
  }, [router]);

  return <>{children}</>;
}
