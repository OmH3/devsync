import { create } from 'zustand';
import { codeeditorService } from '../services/codeeditor.service.js';

export const useCodeEditorStore = create((set, get) => ({
  currentEditor: null,
  executions: [],
  isExecuting: false,
  isLoading: false,
  error: null,

  // Actions
  setCurrentEditor: (editor) => set({ currentEditor: editor }),
  setLoading: (isLoading) => set({ isLoading }),
  setExecuting: (isExecuting) => set({ isExecuting }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Fetch code editor by file ID
  fetchCodeEditorByFileId: async (fileId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await codeeditorService.getCodeEditorByFileId(fileId);
      set({ 
        currentEditor: response.codeEditor, 
        isLoading: false 
      });
      return { success: true, editor: response.codeEditor };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch code editor';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  // Update code editor
  updateCodeEditor: async (editorId, editorData) => {
    set({ error: null });
    try {
      const response = await codeeditorService.updateCodeEditor(editorId, editorData);
      const updatedEditor = response.codeEditor;
      
      set({ currentEditor: updatedEditor });
      return { success: true, editor: updatedEditor };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update code editor';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Execute code
  executeCode: async (editorId, executionData) => {
    set({ isExecuting: true, error: null });
    try {
      const response = await codeeditorService.executeCode(editorId, executionData);
      
      set(state => ({
        executions: [response.execution, ...state.executions],
        isExecuting: false
      }));
      
      return { success: true, execution: response.execution };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to execute code';
      set({ error: errorMessage, isExecuting: false });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch execution history
  fetchExecutionHistory: async (editorId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await codeeditorService.getExecutionHistory(editorId);
      set({ 
        executions: response.executions || [], 
        isLoading: false 
      });
      return { success: true, executions: response.executions || [] };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch execution history';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  clearEditor: () => set({ 
    currentEditor: null, 
    executions: [], 
    error: null 
  }),
}));