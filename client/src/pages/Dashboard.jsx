import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import CreateWorkspaceForm from '../components/CreateWorkspaceForm.jsx';
import WorkspaceList from '../components/WorkspaceList.jsx';
import JoinWorkspace from '../components/JoinWorkspace.jsx';
import DocumentsList from '../components/DocumentsList.jsx';
import CodeEditorMain from '../components/CodeEditorMain.jsx';
import WhiteboardMain from '../components/WhiteboardMain.jsx';
import AudioRoomButton from '../components/AudioRoomButton.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { 
    workspaces, 
    currentWorkspace, 
    fetchUserWorkspaces, 
    setCurrentWorkspace,
    isLoading, 
    error 
  } = useWorkspaceStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'documents', 'whiteboard', 'code', 'video'

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
    // Refresh workspace list
    fetchUserWorkspaces();
  };

  const handleWorkspaceJoined = (result) => {
    console.log('Joined workspace:', result);
    // Refresh workspace list
    fetchUserWorkspaces();
  };

  const handleSelectWorkspace = (workspace) => {
    console.log('Selected workspace:', workspace);
    setCurrentWorkspace(workspace);
    setActiveView('overview'); // Reset to overview when selecting workspace
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied to clipboard!');
  };

  const handleToolClick = (tool) => {
    setActiveView(tool);
  };

  const renderMainContent = () => {
    if (!currentWorkspace) {
      return (
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
      );
    }

    // If workspace is selected, show the tool content
    switch (activeView) {
      case 'documents':
        return (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <DocumentsList workspaceId={currentWorkspace._id} workspace={currentWorkspace} />
            </div>
          </div>
        );
      case 'whiteboard':
        return (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
              <WhiteboardMain workspaceId={currentWorkspace._id} workspace={currentWorkspace} />
            </div>
          </div>
        );
      case 'code':
        return (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
              <CodeEditorMain workspaceId={currentWorkspace._id} workspace={currentWorkspace} />
            </div>
          </div>
        );
      default:
        return (
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
        );
    }
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
                         Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Share this code with others to invite them
                    </p>
                  </div>
                </div>
              </div>
              
              {/*  Workspace Tools Section with Audio Room Button */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {/* Main Tool Buttons */}
                <button 
                  onClick={() => handleToolClick('whiteboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'whiteboard' 
                      ? 'bg-indigo-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                   Open Whiteboard
                </button>
                <button 
                  onClick={() => handleToolClick('documents')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'documents' 
                      ? 'bg-green-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                   Open Documents
                </button>
                <button 
                  onClick={() => handleToolClick('code')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'code' 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                   Open Code Editor
                </button>
                
                {/*  Audio Room Button - Always Visible */}
                <div className="ml-4 pl-4 border-l border-gray-300">
                  <AudioRoomButton workspaceId={currentWorkspace._id} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            {renderMainContent()}

            {/* Quick Actions Sidebar - Only show when not in full-width mode */}
            {currentWorkspace && (activeView === 'overview' || !currentWorkspace) && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={handleJoinWorkspace}
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="font-medium"> Join Workspace</div>
                      <div className="text-sm text-gray-500">Enter an invite code</div>
                    </button>
                    <button 
                      onClick={() => handleToolClick('documents')}
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="font-medium"> Open Documents</div>
                      <div className="text-sm text-gray-500">Collaborative document editing</div>
                    </button>
                    <button 
                      onClick={() => handleToolClick('whiteboard')}
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="font-medium"> Open Whiteboard</div>
                      <div className="text-sm text-gray-500">Visual collaboration</div>
                    </button>
                    <button 
                      onClick={() => handleToolClick('code')}
                      className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="font-medium"> Open Code Editor</div>
                      <div className="text-sm text-gray-500">Collaborative coding</div>
                    </button>
                  </div>

                  {/*  Audio Room Section in Sidebar */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-3"> Team Audio</h4>
                    <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                      <p className="text-sm text-gray-600 mb-3">
                        Start an audio room to talk with your team while working.
                      </p>
                      <AudioRoomButton workspaceId={currentWorkspace._id} />
                    </div>
                  </div>
                </div>

                {/* Current Workspace Invite Code (Alternative Location) */}
                {currentWorkspace && (
                  <div className="bg-white rounded-lg shadow p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4"> Share Workspace</h3>
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
            )}

            {/* Back to Overview Button for Full-Width Views */}
            {currentWorkspace && ['documents', 'whiteboard', 'code', 'video'].includes(activeView) && (
              <div className="lg:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    ← Back to Overview
                  </button>
                  
                  {/*  Audio Room Button - Also visible in full-width views */}
                  <div className="bg-white rounded-lg shadow px-4 py-2 border">
                    <AudioRoomButton workspaceId={currentWorkspace._id} />
                  </div>
                </div>
              </div>
            )}
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