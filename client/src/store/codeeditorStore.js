import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { codeeditorService } from '../services/codeeditor.service.js';

export const useCodeEditorStore = create(
  persist(
    (set, get) => ({
      currentEditor: null,
      editorContent: '',
      editorTitle: '',
      executions: [],
      isExecuting: false,
      isLoading: false,
      isSaving: false,
      error: null,
      hasUnsavedChanges: false,
      lastSaved: null,
      
      //Real-time collaboration states
      userRole: null,
      permissions: null,
      isConnected: false,
      activeUsers: [],
      userCount: 1,
      hasJoinedEditor: false,
      
      //Cursor and selection tracking
      cursors: {}, // Other users' cursors
      selections: {},

      //Basic actions
      setCurrentEditor: (editor) => set({ 
        currentEditor: editor,
        editorContent: editor?.content || '',
        editorTitle: editor?.title || '',
        hasUnsavedChanges: false
      }),
      setEditorContent: (content) => set({ 
        editorContent: content,
        hasUnsavedChanges: true
      }),
      setEditorTitle: (title) => set({ 
        editorTitle: title,
        hasUnsavedChanges: true
      }),
      setLoading: (isLoading) => set({ isLoading }),
      setExecuting: (isExecuting) => set({ isExecuting }),
      setSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
      setLastSaved: (timestamp) => set({ lastSaved: timestamp }),
      
      //Connection and collaboration
      setIsConnected: (connected) => set({ isConnected: connected }),
      setActiveUsers: (users) => set({ activeUsers: users || [] }),
      setUserCount: (count) => set({ userCount: count }),
      setHasJoinedEditor: (joined) => set({ hasJoinedEditor: joined }),
      
      //Permission management
      setUserRole: (role) => set({ userRole: role }),
      setPermissions: (permissions) => set({ permissions }),

      //Fetch user role and permissions for code editor
      fetchUserRoleInCodeEditor: async (editorId) => {
        try {
          const response = await codeeditorService.getUserRoleInCodeEditor(editorId);
          const { role, permissions, isCodeEditorOwner, isWorkspaceOwner, isAdmin } = response;
          
          set({ 
            userRole: role,
            permissions,
            isCodeEditorOwner,
            isWorkspaceOwner,
            isAdmin
          });
          
          return { 
            success: true, 
            role, 
            permissions,
            canEdit: permissions.canEdit
          };
        } catch (error) {
          console.error('Failed to fetch code editor permissions:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch permissions';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      //Fetch code editor by file ID
      fetchCodeEditorByFileId: async (fileId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await codeeditorService.getCodeEditorByFileId(fileId);
          const editor = response.codeEditor;
          
          set({ 
            currentEditor: editor,
            editorContent: editor.content || '',
            editorTitle: editor.title || '',
            hasUnsavedChanges: false,
            isLoading: false 
          });
          
          return { success: true, editor };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch code editor';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      //Update code editor with permission check
      updateCodeEditor: async (editorId, editorData) => {
        const { permissions } = get();
        if (permissions && !permissions.canEdit) {
          set({ error: 'You do not have permission to edit this code editor' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null });
        try {
          const response = await codeeditorService.updateCodeEditor(editorId, editorData);
          const updatedEditor = response.codeEditor;
          
          set({ 
            currentEditor: updatedEditor,
            editorContent: updatedEditor.content || '',
            editorTitle: updatedEditor.title || '',
            hasUnsavedChanges: false,
            lastSaved: new Date()
          });
          
          return { success: true, editor: updatedEditor };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to update code editor';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      //Save code editor content (dedicated for real-time collaboration)
      //FIXED: Save code editor content (matching the function you asked about)
saveCodeEditorContent: async (editorId, title, content) => {
  const { permissions } = get();
  if (permissions && !permissions.canEdit) {
    set({ error: 'You do not have permission to save this code editor' });
    return { success: false, error: 'Permission denied' };
  }

  set({ isExecuting: true, error: null }); //FIXED: Use isExecuting for consistency
  try {
    const result = await codeeditorService.saveCodeEditorContent(
      editorId, 
      title, 
      content,
      get().currentEditor?.language || 'javascript' //FIXED: Include language
    );
    
    if (result.codeEditor) {
      //FIXED: Update current editor properly
      set(state => ({
        currentEditor: {
          ...state.currentEditor,
          ...result.codeEditor,
          title: result.codeEditor.title,
          content: result.codeEditor.content,
          language: result.codeEditor.language
        },
        editorTitle: result.codeEditor.title || '',
        editorContent: result.codeEditor.content || '',
        hasUnsavedChanges: false,
        lastSaved: new Date(),
        isExecuting: false
      }));
    }
    
    return { success: true, editor: result.codeEditor };
  } catch (error) {
    console.error(' Save error:', error);
    const errorMessage = error.response?.data?.message || 'Save failed';
    set({ error: errorMessage, isExecuting: false });
    return { success: false, error: errorMessage };
  }
},

      //Execute code
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

      //Fetch execution history
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

      //Real-time updates from socket
      updateEditorFromSocket: (editorId, updates) => {
        const { currentEditor } = get();
        if (currentEditor?._id === editorId) {
          set({
            editorContent: updates.content || get().editorContent,
            editorTitle: updates.title || get().editorTitle
          });
        }
      },

      addExecutionFromSocket: (execution) => {
        set(state => ({
          executions: [execution, ...state.executions.filter(e => e._id !== execution._id)]
        }));
      },

      //Cursor and selection management
      updateCursor: (userId, cursorPosition, selection) => {
        set(state => ({
          cursors: {
            ...state.cursors,
            [userId]: { position: cursorPosition, selection, timestamp: Date.now() }
          }
        }));
      },

      removeCursor: (userId) => {
        set(state => {
          const newCursors = { ...state.cursors };
          delete newCursors[userId];
          return { cursors: newCursors };
        });
      },

      //Handle user events
      handleUserJoined: (userData) => {
        set(state => ({
          activeUsers: [...state.activeUsers.filter(u => u.userId !== userData.userId), userData]
        }));
      },

      handleUserLeft: (userData) => {
        set(state => ({
          activeUsers: state.activeUsers.filter(u => u.userId !== userData.userId)
        }));
        get().removeCursor(userData.userId);
      },

      //Content management with permission checks
      updateContentWithPermissionCheck: (content) => {
        const { permissions } = get();
        if (!permissions?.canEdit) {
          set({ error: 'You do not have permission to edit this code editor' });
          return false;
        }
        
        set({ 
          editorContent: content,
          hasUnsavedChanges: true
        });
        return true;
      },

      updateTitleWithPermissionCheck: (title) => {
        const { permissions } = get();
        if (!permissions?.canEdit) {
          set({ error: 'You do not have permission to edit this code editor' });
          return false;
        }
        
        set({ 
          editorTitle: title,
          hasUnsavedChanges: true
        });
        return true;
      },

      //Clear editor data
      clearEditor: () => set({ 
        currentEditor: null,
        editorContent: '',
        editorTitle: '',
        executions: [],
        error: null,
        hasUnsavedChanges: false,
        lastSaved: null,
        activeUsers: [],
        userCount: 1,
        isConnected: false,
        hasJoinedEditor: false,
        cursors: {},
        selections: {},
        permissions: null,
        userRole: null
      }),

      //Reset editor state
      resetEditorState: () => set({
        editorContent: '',
        editorTitle: '',
        hasUnsavedChanges: false,
        lastSaved: null,
        activeUsers: [],
        userCount: 1,
        isConnected: false,
        hasJoinedEditor: false,
        cursors: {},
        error: null
      })
    }),
    {
      name: 'codeeditor-storage',
      partialize: (state) => ({ 
        currentEditor: state.currentEditor,
        executions: state.executions?.slice(0, 10) // Only persist last 10 executions
      }),
    }
  )
);