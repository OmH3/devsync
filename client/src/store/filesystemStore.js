import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { filesystemService } from '../services/filesystem.service.js';

export const useFilesystemStore = create(
  persist(
    (set, get) => ({
      fileSystemItems: [],
      currentFolder: null,
      selectedItem: null,
      selectedItems: [], // ✅ For multi-select
      draggedItem: null, // ✅ For drag and drop
      isLoading: false,
      error: null,
      
      // ✅ Real-time collaboration states
      userRole: null,
      permissions: null,
      isConnected: false,
      activeUsers: [],
      userCount: 1,
      
      // ✅ File operations
      copyBuffer: null, // ✅ For copy/paste operations
      clipboard: null,
      isOperationInProgress: false,

      // ✅ Basic actions
      setCurrentFolder: (folder) => set({ currentFolder: folder }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      setSelectedItems: (items) => set({ selectedItems: items }),
      setDraggedItem: (item) => set({ draggedItem: item }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setActiveUsers: (users) => set({ activeUsers: users || [] }),
      setUserCount: (count) => set({ userCount: count }),
      
      // ✅ Permission management
      setUserRole: (role) => set({ userRole: role }),
      setPermissions: (permissions) => set({ permissions }),

      // ✅ Fetch user role and permissions for filesystem item
      fetchUserRoleInFileSystem: async (itemId) => {
        try {
          const response = await filesystemService.getUserRoleInFileSystem(itemId);
          const { role, permissions, isItemOwner, isWorkspaceOwner, isAdmin } = response;
          
          set({ 
            userRole: role,
            permissions,
            isItemOwner,
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
          console.error('Failed to fetch filesystem permissions:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch permissions';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Create file or folder with permission check
      createFileSystemItem: async (itemData) => {
        set({ isLoading: true, error: null, isOperationInProgress: true });
        try {
          const response = await filesystemService.createFileSystemItem(itemData);
          const newItem = response.fileSystemItem;
          
          set(state => ({ 
            fileSystemItems: [...state.fileSystemItems, newItem],
            isLoading: false,
            isOperationInProgress: false
          }));
          
          return { success: true, item: newItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to create item';
          set({ error: errorMessage, isLoading: false, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Fetch workspace file system
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

      // ✅ Update file system item with permission check
      updateFileSystemItem: async (itemId, itemData) => {
        const { permissions } = get();
        if (permissions && !permissions.canEdit) {
          set({ error: 'You do not have permission to edit this item' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null, isOperationInProgress: true });
        try {
          const response = await filesystemService.updateFileSystemItem(itemId, itemData);
          const updatedItem = response.fileSystemItem;
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.map(item => 
              item._id === itemId ? updatedItem : item
            ),
            selectedItem: state.selectedItem?._id === itemId ? updatedItem : state.selectedItem,
            isOperationInProgress: false
          }));
          
          return { success: true, item: updatedItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to update item';
          set({ error: errorMessage, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Move file system item (enhanced for drag & drop)
      moveFileSystemItem: async (itemId, targetParentId) => {
        const { permissions } = get();
        if (permissions && !permissions.canMove) {
          set({ error: 'You do not have permission to move this item' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null, isOperationInProgress: true });
        try {
          const moveData = { newParentId: targetParentId };
          const response = await filesystemService.moveFileSystemItem(itemId, moveData);
          const movedItem = response.fileSystemItem;
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.map(item => 
              item._id === itemId ? movedItem : item
            ),
            selectedItem: state.selectedItem?._id === itemId ? movedItem : state.selectedItem,
            draggedItem: null,
            isOperationInProgress: false
          }));
          
          return { success: true, item: movedItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to move item';
          set({ error: errorMessage, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Delete file system item with permission check
      deleteFileSystemItem: async (itemId) => {
        const { permissions } = get();
        if (permissions && !permissions.canDelete) {
          set({ error: 'You do not have permission to delete this item' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null, isOperationInProgress: true });
        try {
          await filesystemService.deleteFileSystemItem(itemId);
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.filter(item => item._id !== itemId),
            selectedItem: state.selectedItem?._id === itemId ? null : state.selectedItem,
            selectedItems: state.selectedItems.filter(item => item._id !== itemId),
            isOperationInProgress: false
          }));
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to delete item';
          set({ error: errorMessage, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Bulk delete items
      bulkDeleteItems: async (itemIds) => {
        const { permissions } = get();
        if (permissions && !permissions.canDelete) {
          set({ error: 'You do not have permission to delete items' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null, isOperationInProgress: true });
        try {
          const response = await filesystemService.bulkDeleteFileSystemItems(itemIds);
          
          set(state => ({
            fileSystemItems: state.fileSystemItems.filter(item => !itemIds.includes(item._id)),
            selectedItems: [],
            selectedItem: itemIds.includes(state.selectedItem?._id) ? null : state.selectedItem,
            isOperationInProgress: false
          }));
          
          return { success: true, result: response.result };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to delete items';
          set({ error: errorMessage, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Duplicate item
      duplicateFileSystemItem: async (itemId, newName, parentId) => {
        set({ error: null, isOperationInProgress: true });
        try {
          const duplicateData = { name: newName, parentId };
          const response = await filesystemService.duplicateFileSystemItem(itemId, duplicateData);
          const duplicatedItem = response.fileSystemItem;
          
          set(state => ({
            fileSystemItems: [...state.fileSystemItems, duplicatedItem],
            isOperationInProgress: false
          }));
          
          return { success: true, item: duplicatedItem };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to duplicate item';
          set({ error: errorMessage, isOperationInProgress: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Copy to clipboard
      copyToClipboard: (item) => {
        set({ copyBuffer: item, clipboard: { type: 'copy', item } });
      },

      // ✅ Cut to clipboard
      cutToClipboard: (item) => {
        set({ copyBuffer: item, clipboard: { type: 'cut', item } });
      },

      // ✅ Paste from clipboard
      pasteFromClipboard: async (targetParentId) => {
        const { clipboard } = get();
        if (!clipboard) return { success: false, error: 'Nothing to paste' };

        if (clipboard.type === 'copy') {
          // Duplicate the item
          const newName = `${clipboard.item.name} (copy)`;
          return await get().duplicateFileSystemItem(clipboard.item._id, newName, targetParentId);
        } else if (clipboard.type === 'cut') {
          // Move the item
          const result = await get().moveFileSystemItem(clipboard.item._id, targetParentId);
          if (result.success) {
            set({ clipboard: null, copyBuffer: null });
          }
          return result;
        }
      },

      // ✅ Real-time updates from socket
      updateItemFromSocket: (itemId, updates) => {
        set(state => ({
          fileSystemItems: state.fileSystemItems.map(item => 
            item._id === itemId ? { ...item, ...updates } : item
          ),
          selectedItem: state.selectedItem?._id === itemId 
            ? { ...state.selectedItem, ...updates } 
            : state.selectedItem
        }));
      },

      addItemFromSocket: (newItem) => {
        set(state => ({
          fileSystemItems: [...state.fileSystemItems, newItem]
        }));
      },

      removeItemFromSocket: (itemId) => {
        set(state => ({
          fileSystemItems: state.fileSystemItems.filter(item => item._id !== itemId),
          selectedItem: state.selectedItem?._id === itemId ? null : state.selectedItem,
          selectedItems: state.selectedItems.filter(item => item._id !== itemId)
        }));
      },

      // ✅ Handle user events
      handleUserJoined: (userData) => {
        set(state => ({
          activeUsers: [...state.activeUsers.filter(u => u.userId !== userData.userId), userData]
        }));
      },

      handleUserLeft: (userData) => {
        set(state => ({
          activeUsers: state.activeUsers.filter(u => u.userId !== userData.userId)
        }));
      },

      // ✅ Clear all data
      clearFileSystem: () => set({ 
        fileSystemItems: [], 
        currentFolder: null, 
        selectedItem: null,
        selectedItems: [],
        draggedItem: null,
        copyBuffer: null,
        clipboard: null,
        error: null,
        activeUsers: [],
        userCount: 1,
        isConnected: false,
        permissions: null,
        userRole: null
      }),

      // ✅ Reset selection
      clearSelection: () => set({
        selectedItem: null,
        selectedItems: []
      })
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