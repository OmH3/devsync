import { create } from 'zustand';
import axios from 'axios';

interface AuthState {
  token: string | null;
  userId: string | null;
  setAuth: (token: string, userId: string) => void;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
  
  setAuth: (token, userId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    set({ token, userId });
  },
  
  logout: async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    set({ token: null, userId: null });
  },

  refreshTokens: async () => {
    try {
      // Next.js API rewrite will forward this to Go, sending the HttpOnly cookie automatically!
      const res = await axios.post('/api/auth/refresh');
      const { access_token, user_id } = res.data?.data || {};
      
      if (access_token && user_id) {
        localStorage.setItem('token', access_token);
        localStorage.setItem('userId', user_id);
        set({ token: access_token, userId: user_id });
        return true;
      }
      return false;
    } catch (e) {
      // If refresh fails (e.g. cookie expired), clear state
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      set({ token: null, userId: null });
      return false;
    }
  }
}));
