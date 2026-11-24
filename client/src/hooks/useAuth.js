import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
let bootstrap;
export const useAuth = () => {
  const state = useAuthStore();
  const { checkAuth } = state;
  useEffect(() => {
    bootstrap ??= checkAuth();
  }, [checkAuth]);
  return state;
};
