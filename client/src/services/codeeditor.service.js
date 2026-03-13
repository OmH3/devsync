import { api } from '../utils/api.js';

export const codeeditorService = {
  //Create code editor
  async createCodeEditor(editorData) {
    const response = await api.post('/codeeditor/create', editorData);
    return response.data;
  },

  //Get workspace code editors
  async getWorkspaceCodeEditors(workspaceId) {
    const response = await api.get(`/codeeditor/workspace/${workspaceId}`);
    return response.data;
  },

  //Get code editor by file ID
  async getCodeEditorByFileId(fileId) {
    const response = await api.get(`/codeeditor/file/${fileId}`);
    return response.data;
  },

  //Get code editor by ID
  async getCodeEditorById(editorId) {
    const response = await api.get(`/codeeditor/${editorId}`);
    return response.data;
  },

  //Update code editor
  async updateCodeEditor(editorId, editorData) {
    const response = await api.put(`/codeeditor/${editorId}`, editorData);
    return response.data;
  },

  //FIXED: Save code editor content (proper API call)
  async saveCodeEditorContent(editorId, title, content, language) {
    const response = await api.put(`/codeeditor/${editorId}/save`, {
      title,
      content,
      language //Include language in save request
    });
    return response.data;
  },

  //Execute code
  async executeCode(editorId, executionData) {
    const response = await api.post(`/codeeditor/${editorId}/execute`, {
      code: executionData.code,           //Include code
      input: executionData.input || '',   //Include input  
      language: executionData.language,   //Include language
      saveBeforeExecution: true           //Optional flag
    });
    return response.data;
  },

  //Get execution history
  async getExecutionHistory(editorId) {
    const response = await api.get(`/codeeditor/${editorId}/executions`);
    return response.data;
  },

  //Delete code editor
  async deleteCodeEditor(editorId) {
    const response = await api.delete(`/codeeditor/${editorId}`);
    return response.data;
  },

  //Get user role and permissions
  async getUserRoleInCodeEditor(editorId) {
    const response = await api.get(`/codeeditor/${editorId}/user-role`);
    return response.data;
  }
};