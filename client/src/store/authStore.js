import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(userData);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const user = response.user;
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false };
        }
      },

      googleLogin: () => {
        authService.googleLogin();
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const { isAuthenticated, user } = await authService.checkAuthStatus();
          set({ 
            isAuthenticated, 
            user, 
            isLoading: false,
            error: null 
          });
          return { isAuthenticated, user };
        } catch (error) {
          // Don't treat 401 as an error - user is just not logged in
          set({ 
            isAuthenticated: false, 
            user: null, 
            isLoading: false,
            error: null // Clear any previous errors
          });
          return { isAuthenticated: false, user: null };
        }
      },

      clearAuth: () => set({ 
        user: null, 
        isAuthenticated: false, 
        error: null 
      }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);