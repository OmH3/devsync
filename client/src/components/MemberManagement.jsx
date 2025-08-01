import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore.js';

const MemberManagement = ({ workspaceId, onClose }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { 
    workspaceMembers, 
    availableRoles,
    fetchWorkspaceMembers, 
    changeMemberRole,
    isLoading, 
    error,
    clearError 
  } = useWorkspaceStore();

  useEffect(() => {
    const loadMembers = async () => {
      console.log('Loading members for workspace:', workspaceId);
      setLocalError('');
      
      try {
        const result = await fetchWorkspaceMembers(workspaceId);
        console.log('Fetch result:', result);
        
        if (!result.success) {
          setLocalError(result.error || 'Failed to load members');
        }
      } catch (error) {
        console.error('Error in loadMembers:', error);
        setLocalError('Network error while loading members');
      }
    };
    
    if (workspaceId) {
      loadMembers();
    }
  }, [workspaceId, fetchWorkspaceMembers]);

  const handleRoleChange = async () => {
    if (!selectedMember || !selectedRole) {
      setLocalError('Please select a role');
      return;
    }

    console.log('Changing role:', {
      workspaceId,
      memberId: selectedMember._id,
      selectedRole,
      memberUserId: selectedMember.userId._id // ✅ Log the actual user ID
    });

    setIsChangingRole(true);
    setLocalError('');
    
    try {
      // ✅ FIXED: Use the member's user ID, not the member ID
      const result = await changeMemberRole(workspaceId, selectedMember.userId._id, selectedRole);
      
      if (result.success) {
        console.log('Role changed successfully:', result);
        setSelectedMember(null);
        setSelectedRole('');
        
        // Optional: Show success message
        alert(`Role changed to ${result.member.role.name} successfully!`);
      } else {
        setLocalError(result.error || 'Failed to change role');
      }
    } catch (error) {
      console.error('Failed to change member role:', error);
      setLocalError(error.response?.data?.message || 'Network error while changing role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const getRoleBadgeColor = (roleName) => {
    const role = roleName?.toLowerCase();
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-indigo-100 text-indigo-800';
    }
  };

  const hasMembers = workspaceMembers && workspaceMembers.length > 0;
  const displayError = error || localError;

  console.log('Render state:', {
    isLoading,
    hasMembers,
    membersLength: workspaceMembers?.length,
    displayError,
    selectedMember,
    selectedRole
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Member Management
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

        {displayError && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="text-sm text-red-700">{displayError}</div>
              <button
                onClick={() => {
                  clearError();
                  setLocalError('');
                }}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {isLoading && !hasMembers ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading members...</span>
          </div>
        ) : !hasMembers && !displayError ? (
          <div className="text-center py-8 text-gray-500">
            <p>No members found in this workspace.</p>
            <button
              onClick={() => fetchWorkspaceMembers(workspaceId)}
              className="mt-2 text-indigo-600 hover:text-indigo-800"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Members List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">
                  Members ({workspaceMembers?.length || 0})
                </h4>
                <button
                  onClick={() => fetchWorkspaceMembers(workspaceId)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              
              <div className="space-y-3">
                {workspaceMembers?.map((member) => (
                  <div key={member._id} className="flex items-center justify-between bg-white p-4 rounded-md border">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.userId?.profilePicture || 'https://via.placeholder.com/40'}
                        alt={member.userId?.name || 'Unknown User'}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40';
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{member.userId?.name || 'Unknown User'}</p>
                        <p className="text-sm text-gray-500">{member.userId?.email || 'No email'}</p>
                        <p className="text-xs text-gray-400">
                          Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role?.name)}`}>
                        {member.role?.name || 'No Role'}
                      </span>
                      
                      {member.role?.name?.toLowerCase() !== 'owner' && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setSelectedRole(member.role?._id || '');
                            setLocalError('');
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Change Role
                        </button>
                      )}
                    </div>
                  </div>
                )) || []}
              </div>
            </div>

            {/* Role Change Section */}
            {selectedMember && (
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-4">
                  Change role for {selectedMember.userId?.name}
                </h5>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Current role: <span className="font-medium">{selectedMember.role?.name}</span>
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {availableRoles
                      ?.filter(role => role.name?.toLowerCase() !== 'owner')
                      ?.map((role) => (
                      <label key={role._id} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={role._id}
                          checked={selectedRole === role._id}
                          onChange={(e) => {
                            console.log('Selected role:', e.target.value, 'for role:', role);
                            setSelectedRole(e.target.value);
                            setLocalError('');
                          }}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{role.name}</div>
                          <div className="text-sm text-gray-500">
                            {role.name?.toLowerCase() === 'admin' && 'Can manage workspace and members'}
                            {role.name?.toLowerCase() === 'member' && 'Can use all workspace tools'}
                            {role.name?.toLowerCase() === 'viewer' && 'Can only view workspace content'}
                          </div>
                        </div>
                      </label>
                    )) || []}
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleRoleChange}
                    disabled={isChangingRole || selectedRole === selectedMember.role?._id || !selectedRole}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingRole ? 'Updating...' : 'Update Role'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      setSelectedRole('');
                      setLocalError('');
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberManagement;