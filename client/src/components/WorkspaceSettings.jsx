import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import MemberManagement from './MemberManagement.jsx';

const WorkspaceSettings = ({ workspace, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: workspace?.name || '',
    description: workspace?.description || ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  
  const { 
    updateWorkspace, 
    deleteWorkspace, 
    fetchWorkspaceMembers, 
    isLoading, 
    error, 
    clearError 
  } = useWorkspaceStore();

  // Fetch member count when component loads
  useEffect(() => {
    const loadMemberCount = async () => {
      try {
        const result = await fetchWorkspaceMembers(workspace._id);
        if (result.success) {
          setMemberCount(result.members.length);
        }
      } catch (error) {
        console.log('Could not fetch member count');
      }
    };
    loadMemberCount();
  }, [workspace._id, fetchWorkspaceMembers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    clearError();
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Workspace name is required';
    } else if (formData.name.length > 255) {
      errors.name = 'Workspace name must be less than 255 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await updateWorkspace(workspace._id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined
    });
    
    if (result.success) {
      onClose?.();
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmMessage = `Are you sure you want to delete "${workspace.name}"?\n\nThis action cannot be undone and will:\n- Delete all workspace content\n- Remove all members\n- Delete all documents, whiteboards, and code files\n\nType "DELETE" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      const result = await deleteWorkspace(workspace._id);
      if (result.success) {
        onClose?.();
      }
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied to clipboard!');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'members', name: 'Members', icon: '👥' },
    { id: 'tools', name: 'Tools', icon: '🔧' },
    { id: 'danger', name: 'Danger Zone', icon: '⚠️' }
  ];

  if (showMemberManagement) {
    return <MemberManagement workspaceId={workspace._id} onClose={() => setShowMemberManagement(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Workspace Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-1/4 border-r border-gray-200 pr-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="w-3/4 pl-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="flex">
                  <div className="text-sm text-red-700">{error}</div>
                  <button
                    onClick={clearError}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">General Settings</h4>
                <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Workspace Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Updating...' : 'Update Workspace'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h5 className="text-md font-medium text-gray-900 mb-2">Workspace Information</h5>
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="text-sm font-medium">{new Date(workspace.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Owner:</span>
                      <span className="text-sm font-medium">{workspace.owner?.name || 'You'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Members:</span>
                      <span className="text-sm font-medium">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h5 className="text-md font-medium text-gray-900 mb-2">Invite Code</h5>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono flex-1">
                      {workspace?.inviteCode}
                    </code>
                    <button 
                      onClick={() => copyInviteCode(workspace?.inviteCode)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Share this code with others to invite them to your workspace
                  </p>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Member Management</h4>
                  <button
                    onClick={() => setShowMemberManagement(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Manage Members
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  View and manage workspace members, change roles, and handle permissions. Current member count: {memberCount}
                </p>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h5 className="font-medium mb-2">Quick Actions:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View all workspace members</li>
                    <li>• Change member roles (Admin, Member, Viewer)</li>
                    <li>• See member join dates and activity</li>
                    <li>• Manage workspace permissions</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Workspace Tools</h4>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Documents</h5>
                        <p className="text-sm text-gray-600">Collaborative document editing</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        workspace.tools?.docs?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workspace.tools?.docs?.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Whiteboard</h5>
                        <p className="text-sm text-gray-600">Visual collaboration and brainstorming</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        workspace.tools?.whiteboard?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workspace.tools?.whiteboard?.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Code Editor</h5>
                        <p className="text-sm text-gray-600">Real-time code collaboration</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        workspace.tools?.editor?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workspace.tools?.editor?.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Video Call</h5>
                        <p className="text-sm text-gray-600">Voice and video communication</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        workspace.tools?.videoCall?.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workspace.tools?.videoCall?.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div>
                <h4 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h4>
                <div className="border border-red-200 rounded-md p-4 bg-red-50">
                  <h5 className="text-md font-medium text-red-900 mb-2">Delete Workspace</h5>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete a workspace, there is no going back. This will permanently:
                  </p>
                  <ul className="text-sm text-red-700 mb-4 ml-4">
                    <li>• Delete the workspace and all its content</li>
                    <li>• Remove all {memberCount} members from the workspace</li>
                    <li>• Delete all documents, whiteboards, and code files</li>
                    <li>• Delete all chat history and collaboration data</li>
                  </ul>
                  <button
                    onClick={handleDeleteWorkspace}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Workspace'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettings;