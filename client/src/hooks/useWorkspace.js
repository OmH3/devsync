import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore.js';

export const useWorkspace = () => {
  const {
    workspaces,
    currentWorkspace,
    workspaceMembers,
    isLoading,
    error,
    setCurrentWorkspace,
    createWorkspace,
    fetchUserWorkspaces,
    fetchWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    clearError,
    clearWorkspaces
  } = useWorkspaceStore();

  return {
    workspaces,
    currentWorkspace,
    workspaceMembers,
    isLoading,
    error,
    setCurrentWorkspace,
    createWorkspace,
    fetchUserWorkspaces,
    fetchWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    clearError,
    clearWorkspaces
  };
};