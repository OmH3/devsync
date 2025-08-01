import { api } from '../utils/api.js';

export const workspaceService = {
  async createWorkspace(workspaceData) {
    const response = await api.post('/workspace/create/new', workspaceData);
    return response.data;
  },

  async getAllUserWorkspaces() {
    const response = await api.get('/workspace/all');
    return response.data;
  },

  async getWorkspaceById(workspaceId) {
    const response = await api.get(`/workspace/${workspaceId}`);
    return response.data;
  },

  async updateWorkspace(workspaceId, workspaceData) {
    const response = await api.put(`/workspace/update/${workspaceId}`, workspaceData);
    return response.data;
  },

  async deleteWorkspace(workspaceId) {
    const response = await api.delete(`/workspace/delete/${workspaceId}`);
    return response.data;
  },

  // ✅ FIXED: Correct API endpoint
  async getWorkspaceMembers(workspaceId) {
    const response = await api.get(`/workspace/members/${workspaceId}`);
    return response.data;
  },

  // ✅ FIXED: Correct API endpoint
  async changeMemberRole(workspaceId, memberId, roleId) {
    const response = await api.put(`/workspace/change/member/role/${workspaceId}`, {
      memberId,
      roleId
    });
    return response.data;
  },

  async joinWorkspaceByInvite(inviteCode) {
    const response = await api.post(`/member/workspace/${inviteCode}/join`);
    return response.data;
  }
};