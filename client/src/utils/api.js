import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if we're on a protected route
    // Let the auth system handle 401s gracefully instead of auto-redirecting
    if (error.response?.status === 401) {
      // Only redirect if we're not already on login/register page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Clear any stored auth data
        localStorage.removeItem('auth-storage');
      }
    }
    return Promise.reject(error);
  }
);