import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { workspaceService } from '../services/workspace.service.js';

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      workspaceMembers: [],
      availableRoles: [],
      isLoading: false,
      error: null,

      // Actions
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Create new workspace
      createWorkspace: async (workspaceData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await workspaceService.createWorkspace(workspaceData);
          const newWorkspace = response.workspace;
          
          set(state => ({ 
            workspaces: [...state.workspaces, newWorkspace],
            currentWorkspace: newWorkspace,
            isLoading: false 
          }));
          
          return { success: true, workspace: newWorkspace };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to create workspace';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch all user workspaces
      fetchUserWorkspaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await workspaceService.getAllUserWorkspaces();
          set({ 
            workspaces: response.workspaces || [], 
            isLoading: false 
          });
          return { success: true, workspaces: response.workspaces || [] };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch workspaces';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch workspace by ID
      fetchWorkspaceById: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await workspaceService.getWorkspaceById(workspaceId);
          set({ currentWorkspace: response.workspace, isLoading: false });
          return { success: true, workspace: response.workspace };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to fetch workspace';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch workspace members
      fetchWorkspaceMembers: async (workspaceId) => {
        // Only set loading if we don't have members data
        const currentState = get();
        if (currentState.workspaceMembers.length === 0) {
          set({ isLoading: true });
        }
        
        set({ error: null });
        
        try {
          console.log('Fetching members for workspace:', workspaceId);
          const response = await workspaceService.getWorkspaceMembers(workspaceId);
          console.log('Service response:', response);
          
          set({ 
            workspaceMembers: response.members || [],
            availableRoles: response.roles || [],
            isLoading: false 
          });
          
          return { 
            success: true, 
            members: response.members || [], 
            roles: response.roles || [] 
          };
        } catch (error) {
          console.error('Error fetching workspace members:', error);
          const errorMessage = error.response?.data?.message || 'Failed to fetch members';
          set({ 
            error: errorMessage, 
            isLoading: false,
            workspaceMembers: [],
            availableRoles: []
          });
          return { success: false, error: errorMessage };
        }
      },

      // Update workspace
      updateWorkspace: async (workspaceId, workspaceData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await workspaceService.updateWorkspace(workspaceId, workspaceData);
          const updatedWorkspace = response.workspace;
          
          set(state => ({
            workspaces: state.workspaces.map(ws => 
              ws._id === workspaceId ? updatedWorkspace : ws
            ),
            currentWorkspace: state.currentWorkspace?._id === workspaceId 
              ? updatedWorkspace 
              : state.currentWorkspace,
            isLoading: false
          }));
          
          return { success: true, workspace: updatedWorkspace };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to update workspace';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Delete workspace
      deleteWorkspace: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          await workspaceService.deleteWorkspace(workspaceId);
          
          set(state => ({
            workspaces: state.workspaces.filter(ws => ws._id !== workspaceId),
            currentWorkspace: state.currentWorkspace?._id === workspaceId 
              ? null 
              : state.currentWorkspace,
            isLoading: false
          }));
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to delete workspace';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      //FIXED: Change member role with proper state update
      changeMemberRole: async (workspaceId, memberId, roleId) => {
        set({ error: null });
        
        try {
          console.log('Changing member role:', { workspaceId, memberId, roleId });
          const response = await workspaceService.changeMemberRole(workspaceId, memberId, roleId);
          console.log('Change role response:', response);
          
          //Update the specific member in the workspaceMembers array
          set(state => ({
            workspaceMembers: state.workspaceMembers.map(member => {
              if (member._id === response.member._id) {
                return {
                  ...member,
                  role: response.member.role,
                  updatedAt: response.member.updatedAt
                };
              }
              return member;
            })
          }));
          
          return { success: true, member: response.member };
        } catch (error) {
          console.error('Error changing member role:', error);
          const errorMessage = error.response?.data?.message || 'Failed to change member role';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      clearWorkspaces: () => set({ 
        workspaces: [], 
        currentWorkspace: null, 
        workspaceMembers: [],
        availableRoles: [],
        error: null 
      }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ 
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace 
      }),
    }
  )
);