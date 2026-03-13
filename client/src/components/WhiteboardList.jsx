import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';
import CreateWhiteboardModal from './CreateWhiteboardModal.jsx';

const WhiteboardList = ({ workspaceId, onWhiteboardSelect }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    whiteboards, 
    isLoading, 
    error, 
    fetchWorkspaceWhiteboards, 
    deleteWhiteboard,
    userRole, //Get user role from store
    clearError
  } = useWhiteboardStore();

  //Check if user can create/delete based on role
  const canCreateWhiteboards = userRole !== 'MEMBER';
  const canDeleteWhiteboards = userRole === 'OWNER' || userRole === 'ADMIN';

  // Fetch whiteboards when component mounts or workspaceId changes
  useEffect(() => {
    if (workspaceId && !isLoading) {
      fetchWorkspaceWhiteboards(workspaceId);
    }
  }, [workspaceId]); // Remove fetchWorkspaceWhite  boards from dependencies to prevent infinite calls

  const handleCreateSuccess = useCallback((newWhiteboard) => {
    console.log('New whiteboard created:', newWhiteboard);
    // Refresh the list
    if (workspaceId) {
      fetchWorkspaceWhiteboards(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceWhiteboards]);

  const handleDeleteWhiteboard = useCallback(async (whiteboardId, whiteboardTitle) => {
    if (!canDeleteWhiteboards) {
      alert('You do not have permission to delete whiteboards');
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${whiteboardTitle}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      const result = await deleteWhiteboard(whiteboardId);
      if (!result.success) {
        alert(result.error || 'Failed to delete whiteboard');
      }
    }
  }, [deleteWhiteboard, canDeleteWhiteboards]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  //Update rendered whiteboards with conditional delete button
  const renderedWhiteboards = useMemo(() => {
    return whiteboards.map((whiteboard) => (
      <div
        key={whiteboard._id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onWhiteboardSelect?.(whiteboard)}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
            {whiteboard.boardTitle}
          </h3>
          {/*  Only show delete button for owners/admins */}
          {canDeleteWhiteboards && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteWhiteboard(whiteboard._id, whiteboard.boardTitle);
              }}
              className="text-gray-400 hover:text-red-600 ml-2"
              title="Delete whiteboard"
            >
              
            </button>
          )}
        </div>
        
        {whiteboard.boardDescription && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {whiteboard.boardDescription}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {whiteboard.metadata?.elementCount || 0} elements
          </span>
          <span>
            {formatDate(whiteboard.updatedAt)}
          </span>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {whiteboard.creatorId?.profilePicture && (
              <img
                src={whiteboard.creatorId.profilePicture}
                alt={whiteboard.creatorId.name}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-xs text-gray-600">
              {whiteboard.creatorId?.name || 'Unknown'}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">
              {whiteboard.collaborators?.length || 0} collaborators
            </span>
          </div>
        </div>
      </div>
    ));
  }, [whiteboards, onWhiteboardSelect, handleDeleteWhiteboard, formatDate, canDeleteWhiteboards]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Whiteboards</h2>
        {/*  Show create button or role status */}
        {canCreateWhiteboards ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            New Whiteboard
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">View Only</span>
            {userRole && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {userRole}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">
            <p>Error: {error}</p>
          </div>
        ) : whiteboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No whiteboards yet</h3>
            <p className="text-gray-500 mb-4">
              {canCreateWhiteboards 
                ? 'Create your first whiteboard to start collaborating'
                : 'No whiteboards available to view'}
            </p>
            {canCreateWhiteboards && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Whiteboard
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderedWhiteboards}
          </div>
        )}
      </div>

      {/*  Only show create modal for non-members */}
      {canCreateWhiteboards && (
        <CreateWhiteboardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workspaceId={workspaceId}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default WhiteboardList;