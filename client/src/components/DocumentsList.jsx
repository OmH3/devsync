import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore.js';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import { useAuth } from '../hooks/useAuth.js';
import CreateDocumentModal from './CreateDocumentModal.jsx';
import DocumentEditor from './DocumentEditor.jsx';

const DocumentsList = ({ workspaceId, workspace }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canView: true
  });
  
  const { user } = useAuth();
  console.log("user: ", user);
  const { currentWorkspace } = useWorkspaceStore();
  console.log("currentWorkspace: ", currentWorkspace);
  const { 
    documents, 
    fetchWorkspaceDocuments, 
    deleteDocument,
    fetchUserRoleInDocument,
    isLoading, 
    error,
    clearError 
  } = useDocumentStore();

  // ✅ Fetch user role in workspace for document permissions
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!workspaceId || !user?._id) return;

      try {
        // Use workspace store to get user role
        const workspaceRole = currentWorkspace?.members?.find(
          member => member.userId === user._id
        )?.role;
        console.log("workspaceRole: ", workspaceRole);
        setUserRole(workspaceRole);

        // ✅ Set permissions based on role (matching whiteboard pattern)
        const rolePermissions = {
          'OWNER': { canCreate: true, canEdit: true, canDelete: true, canView: true },
          'ADMIN': { canCreate: true, canEdit: true, canDelete: true, canView: true },
          'MEMBER': { canCreate: false, canEdit: false, canDelete: false, canView: true }
        };
        console.log("rolePermissions[workspaceRole]: ", rolePermissions[workspaceRole]);
        setPermissions(rolePermissions[workspaceRole] || {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canView: true
        });

        console.log('📄 User role in documents:', workspaceRole, rolePermissions[workspaceRole]);
      } catch (error) {
        console.error('❌ Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [workspaceId, user?._id, currentWorkspace]);

  // ✅ Fetch documents when workspace changes
  useEffect(() => {
    if (workspaceId && permissions.canView) {
      console.log('📄 Fetching documents for workspace:', workspaceId);
      fetchWorkspaceDocuments(workspaceId);
    }
  }, [workspaceId, permissions.canView, fetchWorkspaceDocuments]);

  // ✅ Enhanced delete with permission check
  const handleDeleteDocument = async (documentId, documentTitle, documentCreatorId) => {
    // Check if user can delete this specific document
    const isOwner = documentCreatorId === user?._id;
    const canDeleteThis = permissions.canDelete || (userRole === 'MEMBER' && isOwner);

    if (!canDeleteThis) {
      alert('You do not have permission to delete this document');
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${documentTitle}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      console.log('🗑️ Deleting document:', documentId);
      const result = await deleteDocument(documentId);
      
      if (result.success) {
        console.log('✅ Document deleted successfully');
        // Close editor if the deleted document was open
        if (selectedDocument?._id === documentId) {
          setSelectedDocument(null);
          setShowEditor(false);
        }
      } else {
        console.error('❌ Failed to delete document:', result.error);
        alert(`Failed to delete document: ${result.error}`);
      }
    }
  };

  // ✅ Enhanced open document with permission check
  const handleOpenDocument = async (document) => {
    try {
      console.log('📄 Opening document:', document._id);
      
      // Fetch specific permissions for this document
      const roleResult = await fetchUserRoleInDocument(document._id);
      
      if (roleResult.success && roleResult.permissions.canView) {
        setSelectedDocument({
          ...document,
          permissions: roleResult.permissions
        });
        setShowEditor(true);
        console.log('✅ Document opened with permissions:', roleResult.permissions);
      } else {
        console.error('❌ Cannot access document:', roleResult.error);
        alert('You do not have permission to access this document');
      }
    } catch (error) {
      console.error('❌ Error opening document:', error);
      alert('Failed to open document');
    }
  };

  // ✅ Helper functions (matching whiteboard pattern)
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWordCount = (content) => {
    if (!content) return 0;
    return content.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getDocumentPermissions = (document) => {
    const isOwner = document.creatorId?._id === user?._id || document.creatorId === user?._id;
    const canEdit = permissions.canEdit || (userRole === 'MEMBER' && isOwner);
    const canDelete = permissions.canDelete || (userRole === 'MEMBER' && isOwner);
    
    return { canEdit, canDelete, isOwner };
  };

  // ✅ Show editor if document is selected
  if (showEditor && selectedDocument) {
    return (
      <DocumentEditor
        document={selectedDocument}
        workspaceId={workspaceId}
        userRole={userRole}
        onClose={() => {
          setShowEditor(false);
          setSelectedDocument(null);
          // Refresh documents list to get updated data
          fetchWorkspaceDocuments(workspaceId);
        }}
        onUpdate={(updatedDoc) => {
          setSelectedDocument(updatedDoc);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with role-based actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <div className="flex items-center space-x-4 text-gray-600">
            <span>Collaborative document editing for {workspace?.name}</span>
            {userRole && (
              <span className="text-sm bg-gray-100 px-2 py-1 rounded-full">
                Role: {userRole}
              </span>
            )}
          </div>
        </div>
        
        {/* ✅ Create button with permission check */}
        {permissions.canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Document</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-red-700">{error}</div>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ✅ Permission warning for members */}
      {userRole === 'MEMBER' && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-yellow-700">
                As a member, you can only edit documents you created. Contact an admin to modify other documents.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">
            {permissions.canCreate 
              ? "Get started by creating your first document" 
              : "No documents available. Contact an admin to create documents."}
          </p>
          {permissions.canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Document
            </button>
          )}
        </div>
      ) : (
        /* Documents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => {
            const docPermissions = getDocumentPermissions(document);
            
            return (
              <div key={document._id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{document.title}</h3>
                    <div className="flex space-x-1 ml-2 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenDocument(document)}
                        className="text-gray-400 hover:text-indigo-600 p-1 rounded-md hover:bg-gray-100"
                        title="Open document"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {docPermissions.canDelete && (
                        <button
                          onClick={() => handleDeleteDocument(document._id, document.title, document.creatorId?._id || document.creatorId)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                          title="Delete document"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* ✅ Document permissions indicator */}
                  <div className="flex items-center space-x-2 mb-3">
                    {docPermissions.isOwner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Owner
                      </span>
                    )}
                    {docPermissions.canEdit && !docPermissions.isOwner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Can Edit
                      </span>
                    )}
                    {!docPermissions.canEdit && !docPermissions.isOwner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Read Only
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {document.content ? (
                      <p className="line-clamp-3">{document.content.substring(0, 150)}...</p>
                    ) : (
                      <p className="italic text-gray-400">No content yet</p>
                    )}
                  </div>

                  {/* ✅ Enhanced document metadata */}
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Words: {document.metadata?.wordCount || getWordCount(document.content)}</span>
                      <span>Characters: {document.metadata?.characterCount || document.content?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {document.creatorId?.name?.charAt(0) || document.creatorId?.email?.charAt(0) || '?'}
                        </span>
                      </div>
                      <span>Created by {document.creatorId?.name || document.creatorId?.email || 'Unknown'}</span>
                    </div>
                    
                    <div>
                      <span>Last edited: {formatDate(document.updatedAt)}</span>
                    </div>
                    
                    {document.lastEditedBy && document.lastEditedBy !== document.creatorId && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-indigo-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {document.lastEditedBy?.name?.charAt(0) || document.lastEditedBy?.email?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span>by {document.lastEditedBy?.name || document.lastEditedBy?.email || 'Unknown'}</span>
                      </div>
                    )}
                  </div>

                  {/* ✅ Action button with permission-based styling */}
                  <button
                    onClick={() => handleOpenDocument(document)}
                    className={`mt-4 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      docPermissions.canEdit 
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {docPermissions.canEdit ? 'Edit Document' : 'View Document'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ Create Document Modal */}
      {showCreateModal && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workspaceId={workspaceId}
          userRole={userRole}
          onSuccess={(newDocument) => {
            setShowCreateModal(false);
            // Refresh documents list
            fetchWorkspaceDocuments(workspaceId);
            // Optionally open the new document
            handleOpenDocument(newDocument);
          }}
        />
      )}
    </div>
  );
};

export default DocumentsList; 