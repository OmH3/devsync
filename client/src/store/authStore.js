import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service.js';
import { useWorkspaceStore } from './workspaceStore.js';
import { useDocumentStore } from './documentStore.js';
import { useWhiteboardStore } from './whiteboardStore.js';
import { useCodeEditorStore } from './codeeditorStore.js';
import { useFilesystemStore } from './filesystemStore.js';

const clearAccountStores = () => {
  useWorkspaceStore.getState().clearWorkspaces();
  useDocumentStore.getState().clearDocuments();
  useWhiteboardStore.getState().clearWhiteboards();
  useCodeEditorStore.getState().clearEditor();
  useFilesystemStore.getState().clearFileSystem();
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
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
          localStorage.removeItem('logout-pending');
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
          localStorage.removeItem('logout-pending');
        } catch {
          localStorage.setItem('logout-pending', 'true');
        }
        clearAccountStores();
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: localStorage.getItem('logout-pending') ? 'Signed out locally. Server sign-out will retry when you reconnect.' : null
        });
        return { success: !localStorage.getItem('logout-pending') };
      },

      googleLogin: () => {
        authService.googleLogin();
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          if (localStorage.getItem('logout-pending')) {
            await authService.logout();
            localStorage.removeItem('logout-pending');
          }
          const { isAuthenticated, user } = await authService.checkAuthStatus();
          if (!isAuthenticated) clearAccountStores();
          set({ 
            isAuthenticated, 
            user, 
            isLoading: false,
            error: null 
          });
          return { isAuthenticated, user };
        } catch {
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

      clearAuth: () => {
        clearAccountStores();
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        });
      },
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
window.addEventListener('devsync:unauthorized', () => useAuthStore.getState().clearAuth());

window.addEventListener('online', () => { if (localStorage.getItem('logout-pending')) useAuthStore.getState().checkAuth(); });
