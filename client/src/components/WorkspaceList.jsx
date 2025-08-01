import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import WorkspaceSettings from './WorkspaceSettings.jsx';
import MemberManagement from './MemberManagement.jsx';

const WorkspaceList = ({ onSelectWorkspace }) => {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const handleSelectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    onSelectWorkspace?.(workspace);
  };

  const handleShowSettings = (workspace, e) => {
    e.stopPropagation();
    setSelectedWorkspace(workspace);
    setShowSettings(true);
  };

  const handleShowMembers = (workspace, e) => {
    e.stopPropagation();
    setSelectedWorkspace(workspace);
    setShowMembers(true);
  };

  const getWorkspaceActions = (workspace) => {
    return (
      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleShowMembers(workspace, e)}
          className="text-gray-400 hover:text-indigo-600 p-2 rounded transition-colors"
          title="Manage Members"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </button>
        <button
          onClick={(e) => handleShowSettings(workspace, e)}
          className="text-gray-400 hover:text-indigo-600 p-2 rounded transition-colors"
          title="Workspace Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Your Workspaces</h3>
      
      {workspaces.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2M9 7h6m-6 4h6m-6 4h6m-6 4h6" />
          </svg>
          <p className="mt-2">No workspaces found</p>
          <p className="text-sm">Create your first workspace to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <div
              key={workspace._id}
              onClick={() => handleSelectWorkspace(workspace)}
              className={`group p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                currentWorkspace?._id === workspace._id
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 truncate">{workspace.name}</h4>
                    {currentWorkspace?._id === workspace._id && (
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Current
                      </span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workspace.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Created {new Date(workspace.createdAt).toLocaleDateString()}</span>
                    <span>Invite: {workspace.inviteCode}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getWorkspaceActions(workspace)}
                  {currentWorkspace?._id === workspace._id && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showSettings && selectedWorkspace && (
        <WorkspaceSettings
          workspace={selectedWorkspace}
          onClose={() => {
            setShowSettings(false);
            setSelectedWorkspace(null);
          }}
        />
      )}

      {showMembers && selectedWorkspace && (
        <MemberManagement
          workspaceId={selectedWorkspace._id}
          onClose={() => {
            setShowMembers(false);
            setSelectedWorkspace(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkspaceList;