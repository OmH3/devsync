import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';
import CreateWhiteboardModal from './CreateWhiteboardModal.jsx';

const WhiteboardList = ({ workspaceId, onWhiteboardSelect }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    whiteboards, 
    fetchWorkspaceWhiteboards, 
    deleteWhiteboard,
    isLoading, 
    error, 
    clearError 
  } = useWhiteboardStore();

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceWhiteboards(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceWhiteboards]);

  const handleCreateSuccess = (newWhiteboard) => {
    console.log('New whiteboard created:', newWhiteboard);
  };

  const handleDeleteWhiteboard = async (whiteboardId, whiteboardTitle) => {
    const confirmMessage = `Are you sure you want to delete "${whiteboardTitle}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      await deleteWhiteboard(whiteboardId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Whiteboards</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          New Whiteboard
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : whiteboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No whiteboards yet</h3>
            <p className="text-gray-500 mb-4">Create your first whiteboard to start collaborating</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Whiteboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whiteboards.map((whiteboard) => (
              <div
                key={whiteboard._id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onWhiteboardSelect?.(whiteboard)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                    {whiteboard.boardTitle}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWhiteboard(whiteboard._id, whiteboard.boardTitle);
                    }}
                    className="text-gray-400 hover:text-red-600 ml-2"
                    title="Delete whiteboard"
                  >
                    🗑️
                  </button>
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
                    <img
                      src={whiteboard.creatorId?.profilePicture}
                      alt={whiteboard.creatorId?.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-gray-600">
                      {whiteboard.creatorId?.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">
                      {whiteboard.collaborators?.length || 0} collaborators
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateWhiteboardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        workspaceId={workspaceId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default WhiteboardList;