import axios from 'axios';
import { API_ORIGIN } from '../config/env.js';

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

//Add request interceptor to ensure credentials
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
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
        window.dispatchEvent(new Event('devsync:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);
