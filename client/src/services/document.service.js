import { api } from '../utils/api.js';

export const documentService = {
  async createDocument(documentData) {
    const response = await api.post('/docs/create', documentData);
    return response.data;
  },

  async getWorkspaceDocuments(workspaceId) {
    const response = await api.get(`/docs/workspace/${workspaceId}`);
    return response.data;
  },

  async getDocumentById(documentId) {
    const response = await api.get(`/docs/${documentId}`);
    return response.data;
  },

  async updateDocument(documentId, documentData) {
    const response = await api.put(`/docs/${documentId}`, documentData);
    return response.data;
  },

  async deleteDocument(documentId) {
    const response = await api.delete(`/docs/${documentId}`);
    return response.data;
  }
};