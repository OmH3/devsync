import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Add request interceptor to ensure credentials
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
        localStorage.removeItem('auth-storage');
      }
    }
    return Promise.reject(error);
  }
);

// Get Stream token from backend
export const getStreamToken = async () => {
  try {
    const response = await api.get('/stream/token');
    return response.data;
  } catch (error) {
    console.error('Error getting stream token:', error);
    throw error;
  }
};

// Keep only these functions:
export const joinCall = async (callId) => {
  try {
    const response = await api.post(`/stream/join-call/${callId}`);
    return response.data;
  } catch (error) {
    console.error('Error joining call:', error);
    throw error;
  }
};

export const getCallStatus = async (callId) => {
  try {
    const response = await api.get(`/stream/call-status/${callId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting call status:', error);
    throw error;
  }
};