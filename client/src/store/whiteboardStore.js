import { create } from "zustand";
import { persist } from "zustand/middleware";
import { whiteboardService } from "../services/whiteboard.service.js";

export const useWhiteboardStore = create(
  persist(
    (set, get) => ({
      whiteboards: [],
      currentWhiteboard: null,
      canvasElements: [],
      drawingData: [], // Ensure this is always an array
      selectedTool: "pen",
      selectedColor: "#000000",
      strokeWidth: 2,
      isLoading: false,
      error: null,
      userCount: 1,
      isConnected: false,
      userRole: null, //Add user role state
      canEdit: false, //Add edit permission state

      // Actions
      setUserCount: (count) => set({ userCount: count }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setUserRole: (role) => set({ userRole: role }), //Add role setter
      setCanEdit: (canEdit) => set({ canEdit }), //Add edit permission setter
      setCurrentWhiteboard: (whiteboard) => set({ currentWhiteboard: whiteboard }),
      setCanvasElements: (elements) => set({ canvasElements: elements || [] }),
      setDrawingData: (data) => set({ drawingData: Array.isArray(data) ? data : [] }),
      setSelectedTool: (tool) => set({ selectedTool: tool }),
      setSelectedColor: (color) => set({ selectedColor: color }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      //Add method to fetch user role
      fetchUserRoleInWhiteboard: async (whiteboardId) => {
        try {
          const response = await whiteboardService.getUserRoleInWhiteboard(whiteboardId);
          const { role, permissions } = response;
          
          set({ 
            userRole: role,
            canEdit: permissions.canEdit 
          });
          
          return { success: true, role, canEdit: permissions.canEdit };
        } catch (error) {
          console.error('Failed to fetch user role:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch user role';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Drawing actions with permission checks
      addDrawingElement: (element) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return false;
        }
        
        set((state) => ({
          drawingData: [...(state.drawingData || []), element],
        }));
        return true;
      },

      clearDrawingData: () => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to clear this whiteboard' });
          return false;
        }
        
        set({ drawingData: [] });
        return true;
      },

      // Save drawing data to backend with permission check
      saveDrawingData: async (whiteboardId, elements) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return { success: false, error: 'Permission denied' };
        }

        try {
          const elementsArray = Array.isArray(elements) ? elements : [];
          const response = await whiteboardService.updateWhiteboard(whiteboardId, {
            boardElements: elementsArray
          });
          
          set((state) => ({
            drawingData: elementsArray,
            currentWhiteboard: response.whiteboard
          }));
          
          return { success: true };
        } catch (error) {
          console.error('Failed to save drawing data:', error);
          const errorMessage = error.response?.data?.message || 'Failed to save drawing data';
          set({ error: errorMessage });
          return { success: false, error: error.message };
        }
      },

      //Update create/delete with role checks
      createWhiteboard: async (whiteboardData) => {
        const { userRole } = get();
        if (userRole === 'MEMBER') {
          set({ error: 'Members cannot create whiteboards' });
          return { success: false, error: 'Permission denied' };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await whiteboardService.createWhiteboard(whiteboardData);
          const newWhiteboard = response.whiteboard;

          set((state) => ({
            whiteboards: [...state.whiteboards, newWhiteboard],
            isLoading: false,
          }));

          return { success: true, whiteboard: newWhiteboard };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Failed to create whiteboard";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      fetchWorkspaceWhiteboards: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await whiteboardService.getWorkspaceWhiteboards(workspaceId);
          set({
            whiteboards: response.whiteboards || [],
            isLoading: false,
          });
          return { success: true, whiteboards: response.whiteboards || [] };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Failed to fetch whiteboards";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      fetchWhiteboardById: async (whiteboardId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await whiteboardService.getWhiteboardById(whiteboardId);
          const whiteboard = response.whiteboard;

          set({
            currentWhiteboard: whiteboard,
            canvasElements: whiteboard.boardElements || [],
            drawingData: whiteboard.boardElements || [],
            isLoading: false,
          });

          return { success: true, whiteboard };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Failed to fetch whiteboard";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      updateWhiteboard: async (whiteboardId, whiteboardData) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null });
        try {
          const response = await whiteboardService.updateWhiteboard(whiteboardId, whiteboardData);
          const updatedWhiteboard = response.whiteboard;

          set((state) => ({
            whiteboards: state.whiteboards.map((wb) =>
              wb._id === whiteboardId ? updatedWhiteboard : wb
            ),
            currentWhiteboard:
              state.currentWhiteboard?._id === whiteboardId
                ? updatedWhiteboard
                : state.currentWhiteboard,
          }));

          return { success: true, whiteboard: updatedWhiteboard };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Failed to update whiteboard";
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      deleteWhiteboard: async (whiteboardId) => {
        const { userRole } = get();
        if (userRole === 'MEMBER') {
          set({ error: 'Members cannot delete whiteboards' });
          return { success: false, error: 'Permission denied' };
        }

        set({ error: null });
        try {
          await whiteboardService.deleteWhiteboard(whiteboardId);

          set((state) => ({
            whiteboards: state.whiteboards.filter((wb) => wb._id !== whiteboardId),
            currentWhiteboard: state.currentWhiteboard?._id === whiteboardId ? null : state.currentWhiteboard,
          }));

          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Failed to delete whiteboard";
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      addCanvasElement: (element) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return false;
        }

        set((state) => ({
          canvasElements: [...(state.canvasElements || []), element],
        }));
        return true;
      },

      updateCanvasElement: (elementId, updates) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return false;
        }

        set((state) => ({
          canvasElements: (state.canvasElements || []).map((element) =>
            element.id === elementId ? { ...element, ...updates } : element
          ),
        }));
        return true;
      },

      deleteCanvasElement: (elementId) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to edit this whiteboard' });
          return false;
        }

        set((state) => ({
          canvasElements: (state.canvasElements || []).filter(
            (element) => element.id !== elementId
          ),
        }));
        return true;
      },

      clearCanvas: () => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: 'You do not have permission to clear this whiteboard' });
          return false;
        }

        set({ canvasElements: [], drawingData: [] });
        return true;
      },

      clearWhiteboards: () => {
        set({
          whiteboards: [],
          currentWhiteboard: null,
          canvasElements: [],
          drawingData: [],
          error: null,
          userRole: null,
          canEdit: false,
        });
      },
    }),
    {
      name: "whiteboard-storage",
      partialize: (state) => ({
        selectedTool: state.selectedTool,
        selectedColor: state.selectedColor,
        strokeWidth: state.strokeWidth,
      }),
    }
  )
);