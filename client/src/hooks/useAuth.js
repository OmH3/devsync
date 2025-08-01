import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    register,
    login,
    logout,
    googleLogin,
    checkAuth,
    clearError,
    clearAuth
  } = useAuthStore();

  useEffect(() => {
    // Only check auth if we have persisted authentication data
    // AND we don't already have a user loaded
    const storedAuth = localStorage.getItem('auth-storage');
    
    if (storedAuth && !user && !isLoading) {
      try {
        const parsed = JSON.parse(storedAuth);
        
        // Only check if the stored data indicates user was authenticated
        // and we don't already have user data
        if (parsed.state?.isAuthenticated && parsed.state?.user && !user) {
          console.log('Found stored auth, verifying with server...');
          checkAuth();
        }
      } catch (error) {
        console.warn('Failed to parse stored auth data:', error);
        clearAuth();
      }
    }
  }, []); // Empty dependency array - only run once on mount

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    register,
    login,
    logout,
    googleLogin,
    checkAuth,
    clearError,
    clearAuth
  };
};