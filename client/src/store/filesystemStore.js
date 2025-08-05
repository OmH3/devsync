import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { filesystemService } from '../services/filesystem.service.js';

export const useFilesystemStore = create(
  persist(
    (set, get) => ({
      fileSystemItems: [],
      currentFolder: null,
      selectedItem: null,
      isLoading: false,
      error: null,

      // Actions
      setCurrentFolder: (folder) => set({ currentFolder: folder }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Create file or folder
      createFileSystemItem: async (itemData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await filesystemService.createFileSystemItem(itemData);
          const newItem = response.fileSystemItem;
          
          set(state => ({ 
            fileSystemItems: [...state.fileSystemItems, newItem],
            isLoading: false 
          }));
          
          return { success: true, item: newItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to create item';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch workspace file system
      fetchWorkspaceFileSystem: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await filesystemService.getWorkspaceFileSystem(workspaceId);
          set({ 
            fileSystemItems: response.fileSystemItems || [], 
            isLoading: false 
          });
          return { success: true, items: response.fileSystemItems || [] };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch file system';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Update file system item
      updateFileSystemItem: async (itemId, itemData) => {
        set({ error: null });
        try {
          const response = await filesystemService.updateFileSystemItem(itemId, itemData);
          const updatedItem = response.fileSystemItem;
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.map(item => 
              item._id === itemId ? updatedItem : item
            )
          }));
          
          return { success: true, item: updatedItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to update item';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Delete file system item
      deleteFileSystemItem: async (itemId) => {
        set({ error: null });
        try {
          await filesystemService.deleteFileSystemItem(itemId);
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.filter(item => item._id !== itemId),
            selectedItem: state.selectedItem?._id === itemId ? null : state.selectedItem
          }));
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to delete item';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Move file system item
      moveFileSystemItem: async (itemId, moveData) => {
        set({ error: null });
        try {
          const response = await filesystemService.moveFileSystemItem(itemId, moveData);
          const movedItem = response.fileSystemItem;
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.map(item => 
              item._id === itemId ? movedItem : item
            )
          }));
          
          return { success: true, item: movedItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to move item';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      clearFileSystem: () => set({ 
        fileSystemItems: [], 
        currentFolder: null, 
        selectedItem: null, 
        error: null 
      }),
    }),
    {
      name: 'filesystem-storage',
      partialize: (state) => ({ 
        fileSystemItems: state.fileSystemItems,
        currentFolder: state.currentFolder 
      }),
    }
  )
);