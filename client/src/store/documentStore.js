import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { documentService } from '../services/document.service.js';

export const useDocumentStore = create(
  persist(
    (set, get) => ({
      documents: [],
      currentDocument: null,
      isLoading: false,
      error: null,

      // Actions
      setCurrentDocument: (document) => set({ currentDocument: document }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Create new document
      createDocument: async (documentData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentService.createDocument(documentData);
          const newDocument = response.doc;
          
          set(state => ({ 
            documents: [newDocument, ...state.documents],
            currentDocument: newDocument,
            isLoading: false 
          }));
          
          return { success: true, document: newDocument };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to create document';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch workspace documents
      fetchWorkspaceDocuments: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentService.getWorkspaceDocuments(workspaceId);
          set({ 
            documents: response.docs || [], 
            isLoading: false 
          });
          return { success: true, documents: response.docs || [] };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch documents';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch document by ID
      fetchDocumentById: async (documentId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentService.getDocumentById(documentId);
          set({ 
            currentDocument: response.doc, 
            isLoading: false 
          });
          return { success: true, document: response.doc };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch document';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Update document
      updateDocument: async (documentId, documentData) => {
        set({ error: null });
        try {
          const response = await documentService.updateDocument(documentId, documentData);
          const updatedDocument = response.doc;
          
          set(state => ({
            documents: state.documents.map(doc => 
              doc._id === documentId ? updatedDocument : doc
            ),
            currentDocument: state.currentDocument?._id === documentId 
              ? updatedDocument 
              : state.currentDocument
          }));
          
          return { success: true, document: updatedDocument };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to update document';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Delete document
      deleteDocument: async (documentId) => {
        set({ error: null });
        try {
          await documentService.deleteDocument(documentId);
          
          set(state => ({
            documents: state.documents.filter(doc => doc._id !== documentId),
            currentDocument: state.currentDocument?._id === documentId 
              ? null 
              : state.currentDocument
          }));
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to delete document';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Real-time document updates (for socket integration)
      updateDocumentContent: (documentId, content) => {
        set(state => ({
          documents: state.documents.map(doc => 
            doc._id === documentId ? { ...doc, content } : doc
          ),
          currentDocument: state.currentDocument?._id === documentId 
            ? { ...state.currentDocument, content }
            : state.currentDocument
        }));
      },

      clearDocuments: () => set({ 
        documents: [], 
        currentDocument: null, 
        error: null 
      }),
    }),
    {
      name: 'document-storage',
      partialize: (state) => ({ 
        documents: state.documents,
        currentDocument: state.currentDocument 
      }),
    }
  )
);