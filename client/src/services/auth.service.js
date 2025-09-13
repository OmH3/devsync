import { api } from '../utils/api.js';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async googleLogin() {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  },

  async getCurrentUser() {
    const response = await api.get('/user/current');
    return response.data;
  },

  async checkAuthStatus() {
    try {
      const response = await api.get('/user/current');
      
      // Your backend returns { message, user }
      return { 
        isAuthenticated: true, 
        user: response.data.user 
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return { isAuthenticated: false, user: null };
      }
      return { isAuthenticated: false, user: null };
    }
  }
};