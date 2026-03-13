import { api } from '../utils/api.js';

export const documentService = {
  //Create document (matches backend route: POST /docs/create)
  async createDocument(documentData) {
    const response = await api.post('/docs/create', documentData);
    return response.data;
  },

  //Get workspace documents (matches backend route: GET /docs/workspace/:workspaceId)
  async getWorkspaceDocuments(workspaceId) {
    const response = await api.get(`/docs/workspace/${workspaceId}`);
    return response.data;
  },

  //Get document by ID (matches backend route: GET /docs/:id)
  async getDocumentById(documentId) {
    const response = await api.get(`/docs/${documentId}`);
    return response.data;
  },

  //Update document (matches backend route: PUT /docs/:id)
  async updateDocument(documentId, documentData) {
    const response = await api.put(`/docs/${documentId}`, documentData);
    return response.data;
  },

  //Delete document (matches backend route: DELETE /docs/:id)
  async deleteDocument(documentId) {
    const response = await api.delete(`/docs/${documentId}`);
    return response.data;
  },

  //FIX: Get user role for workspace (to match whiteboard pattern)
  async getUserRoleInWorkspace(workspaceId) {
    const response = await api.get(`/docs/user-role/${workspaceId}`);
    return response.data;
  },

  //Save document content (uses update document endpoint for auto-save functionality)
  async saveDocumentContent(documentId, title, content) {
    const response = await api.put(`/docs/${documentId}`, {
      title: title.trim(),
      content: content
    });
    return response.data;
  }
};