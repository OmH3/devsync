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
  },

  // ✅ Add method to get user role and permissions for a whiteboard
  async getUserRoleInWhiteboard(whiteboardId) {
    const response = await api.get(`/whiteboard/${whiteboardId}/user-role`);
    return response.data;
  },

  // ✅ Additional methods for whiteboard collaboration
  async saveWhiteboardElements(whiteboardId, elements) {
    const response = await api.put(`/whiteboard/${whiteboardId}/elements`, {
      boardElements: elements
    });
    return response.data;
  },

  async getWhiteboardElements(whiteboardId) {
    const response = await api.get(`/whiteboard/${whiteboardId}/elements`);
    return response.data;
  },

  async addCollaborator(whiteboardId, collaboratorData) {
    const response = await api.post(`/whiteboard/${whiteboardId}/collaborators`, collaboratorData);
    return response.data;
  },

  async removeCollaborator(whiteboardId, collaboratorId) {
    const response = await api.delete(`/whiteboard/${whiteboardId}/collaborators/${collaboratorId}`);
    return response.data;
  },

  async getWhiteboardCollaborators(whiteboardId) {
    const response = await api.get(`/whiteboard/${whiteboardId}/collaborators`);
    return response.data;
  },

  async clearWhiteboardElements(whiteboardId) {
    const response = await api.delete(`/whiteboard/${whiteboardId}/elements`);
    return response.data;
  }
};