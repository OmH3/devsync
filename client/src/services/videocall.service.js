import { api } from '../utils/api.js';

export const videoCallService = {
  async startVideoCall(workspaceId) {
    const response = await api.post('/videocall/start', { workspaceId });
    return response.data;
  },

  async joinVideoCall(workspaceId) {
    const response = await api.post('/videocall/join', { workspaceId });
    return response.data;
  },

  async endVideoCall(workspaceId) {
    const response = await api.post('/videocall/end', { workspaceId });
    return response.data;
  },

  async getVideoCallStatus(workspaceId) {
    const response = await api.get(`/videocall/status/${workspaceId}`);
    return response.data;
  }
};