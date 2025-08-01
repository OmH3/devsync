import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import CreateWorkspaceForm from '../components/CreateWorkspaceForm.jsx';
import WorkspaceList from '../components/WorkspaceList.jsx';
import JoinWorkspace from '../components/JoinWorkspace.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { 
    workspaces, 
    currentWorkspace, 
    fetchUserWorkspaces, 
    isLoading, 
    error 
  } = useWorkspaceStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    // Fetch user workspaces when component mounts
    fetchUserWorkspaces();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleCreateWorkspace = () => {
    setShowCreateForm(true);
  };

  const handleJoinWorkspace = () => {
    setShowJoinForm(true);
  };

  const handleWorkspaceCreated = (newWorkspace) => {
    console.log('New workspace created:', newWorkspace);
  };

  const handleWorkspaceJoined = (result) => {
    console.log('Joined workspace:', result);
    // Refresh workspace list
    fetchUserWorkspaces();
  };

  const handleSelectWorkspace = (workspace) => {
    console.log('Selected workspace:', workspace);
    // You can add navigation logic here to go to workspace detail page
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
    alert('Invite code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">DevSync Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Current Workspace Info */}
          {currentWorkspace && (
            <div className="mb-6 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Current Workspace: {currentWorkspace.name}
                  </h2>
                  {currentWorkspace.description && (
                    <p className="text-gray-600">{currentWorkspace.description}</p>
                  )}
                </div>
                
                {/* Invite Code Display */}
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Invite Code</h3>
                    <div className="flex items-center space-x-2">
                      <code className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-md text-lg font-mono font-bold">
                        {currentWorkspace.inviteCode}
                      </code>
                      <button
                        onClick={() => copyInviteCode(currentWorkspace.inviteCode)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                        title="Copy invite code"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Share this code with others to invite them
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-4">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Open Whiteboard
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Open Documents
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Open Code Editor
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Start Video Call
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workspace Management */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Workspaces</h2>
                  <div className="space-x-2">
                    <button
                      onClick={handleJoinWorkspace}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Join Workspace
                    </button>
                    <button
                      onClick={handleCreateWorkspace}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Create Workspace
                    </button>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : error ? (
                  <div className="text-red-600 text-center py-4">
                    Error: {error}
                  </div>
                ) : (
                  <WorkspaceList onSelectWorkspace={handleSelectWorkspace} />
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={handleJoinWorkspace}
                    className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                  >
                    <div className="font-medium">Join Workspace</div>
                    <div className="text-sm text-gray-500">Enter an invite code</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50">
                    <div className="font-medium">Recent Files</div>
                    <div className="text-sm text-gray-500">View recent documents</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50">
                    <div className="font-medium">Settings</div>
                    <div className="text-sm text-gray-500">Manage your account</div>
                  </button>
                </div>
              </div>

              {/* Current Workspace Invite Code (Alternative Location) */}
              {currentWorkspace && (
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Workspace</h3>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Current workspace invite code:
                    </p>
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <code className="text-lg font-mono font-bold text-indigo-700">
                        {currentWorkspace.inviteCode}
                      </code>
                    </div>
                    <button
                      onClick={() => copyInviteCode(currentWorkspace.inviteCode)}
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Copy Invite Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showCreateForm && (
        <CreateWorkspaceForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleWorkspaceCreated}
        />
      )}

      {showJoinForm && (
        <JoinWorkspace
          onClose={() => setShowJoinForm(false)}
          onSuccess={handleWorkspaceJoined}
        />
      )}
    </div>
  );
};

export default Dashboard;