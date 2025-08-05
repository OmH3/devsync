import { api } from '../utils/api.js';

export const whiteboardService = {
  async createWhiteboard(whiteboardData) {
    const response = await api.post('/whiteboard/create', whiteboardData);
    return response.data;
  },

  async getWorkspaceWhiteboards(workspaceId) {
    const response = await api.get(`/whiteboard/workspace/${workspaceId}`);
    return response.data;
  },

  async getWhiteboardById(whiteboardId) {
    const response = await api.get(`/whiteboard/${whiteboardId}`);
    return response.data;
  },

  async updateWhiteboard(whiteboardId, whiteboardData) {
    const response = await api.put(`/whiteboard/${whiteboardId}`, whiteboardData);
    return response.data;
  },

  async deleteWhiteboard(whiteboardId) {
    const response = await api.delete(`/whiteboard/${whiteboardId}`);
    return response.data;
  }
};