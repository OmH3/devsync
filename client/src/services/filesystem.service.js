import { api } from '../utils/api.js';

export const filesystemService = {
  // ✅ Create file system item
  async createFileSystemItem(itemData) {
    const response = await api.post('/filesystem/create', itemData);
    return response.data;
  },

  // ✅ Get workspace file system
  async getWorkspaceFileSystem(workspaceId) {
    const response = await api.get(`/filesystem/workspace/${workspaceId}`);
    return response.data;
  },

  // ✅ Get file system tree (new)
  async getFileSystemTree(workspaceId) {
    const response = await api.get(`/filesystem/workspace/${workspaceId}/tree`);
    return response.data;
  },

  // ✅ Get file system item by ID
  async getFileSystemItemById(itemId) {
    const response = await api.get(`/filesystem/${itemId}`);
    return response.data;
  },

  // ✅ Get file content (new)
  async getFileSystemItemContent(itemId) {
    const response = await api.get(`/filesystem/${itemId}/content`);
    return response.data;
  },

  // ✅ Update file system item
  async updateFileSystemItem(itemId, itemData) {
    const response = await api.put(`/filesystem/${itemId}`, itemData);
    return response.data;
  },

  // ✅ Update file content (new)
  async updateFileSystemItemContent(itemId, contentData) {
    const response = await api.put(`/filesystem/${itemId}/content`, contentData);
    return response.data;
  },

  // ✅ Move file system item
  async moveFileSystemItem(itemId, moveData) {
    const response = await api.put(`/filesystem/${itemId}/move`, moveData);
    return response.data;
  },

  // ✅ Duplicate file system item (new)
  async duplicateFileSystemItem(itemId, duplicateData) {
    const response = await api.post(`/filesystem/${itemId}/duplicate`, duplicateData);
    return response.data;
  },

  // ✅ Get item history (new)
  async getFileSystemItemHistory(itemId) {
    const response = await api.get(`/filesystem/${itemId}/history`);
    return response.data;
  },

  // ✅ Bulk delete items (new)
  async bulkDeleteFileSystemItems(itemIds) {
    const response = await api.delete('/filesystem/bulk', { data: { itemIds } });
    return response.data;
  },

  // ✅ Delete file system item
  async deleteFileSystemItem(itemId) {
    const response = await api.delete(`/filesystem/${itemId}`);
    return response.data;
  },

  // ✅ Get user role and permissions (new)
  async getUserRoleInFileSystem(itemId) {
    const response = await api.get(`/filesystem/${itemId}/user-role`);
    return response.data;
  }
};