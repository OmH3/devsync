import { api } from '../utils/api.js';

export const filesystemService = {
  async createFileSystemItem(itemData) {
    const response = await api.post('/filesystem/create', itemData);
    return response.data;
  },

  async getWorkspaceFileSystem(workspaceId) {
    const response = await api.get(`/filesystem/workspace/${workspaceId}`);
    return response.data;
  },

  async getFileSystemItemById(itemId) {
    const response = await api.get(`/filesystem/${itemId}`);
    return response.data;
  },

  async updateFileSystemItem(itemId, itemData) {
    const response = await api.put(`/filesystem/${itemId}`, itemData);
    return response.data;
  },

  async deleteFileSystemItem(itemId) {
    const response = await api.delete(`/filesystem/${itemId}`);
    return response.data;
  },

  async moveFileSystemItem(itemId, moveData) {
    const response = await api.put(`/filesystem/${itemId}/move`, moveData);
    return response.data;
  }
};