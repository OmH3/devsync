import { api } from '../utils/api.js';

export const codeeditorService = {
  async getCodeEditorByFileId(fileId) {
    const response = await api.get(`/codeeditor/file/${fileId}`);
    return response.data;
  },

  async updateCodeEditor(editorId, editorData) {
    const response = await api.put(`/codeeditor/${editorId}`, editorData);
    return response.data;
  },

  async executeCode(editorId, executionData) {
    const response = await api.post(`/codeeditor/${editorId}/execute`, executionData);
    return response.data;
  },

  async getExecutionHistory(editorId) {
    const response = await api.get(`/codeeditor/${editorId}/executions`);
    return response.data;
  }
};