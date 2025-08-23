import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore.js';
import { useAuth } from '../hooks/useAuth.js';
import CreateDocumentModal from './CreateDocumentModal.jsx';
import DocumentEditor from './DocumentEditor.jsx';

const DocumentsList = ({ workspaceId, workspace }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const { user } = useAuth();
  
  const { 
    documents, 
    fetchWorkspaceDocuments, 
    deleteDocument,
    fetchUserRoleInDocument,
    isLoading, 
    error,
    clearError,
    userRole, // ✅ Get user role directly from store
    canCreate, // ✅ Get permissions directly from store
    canEdit,
    canDelete,
    canView
  } = useDocumentStore();

  // ✅ Check if user can create/delete based on role (matching whiteboard pattern)
  const canCreateDocuments = userRole !== 'MEMBER';
  const canDeleteDocuments = userRole === 'OWNER' || userRole === 'ADMIN';

  // ✅ Fetch user role when component mounts (matching whiteboard pattern)
  useEffect(() => {
    if (workspaceId) {
      console.log('📄 Fetching user role for workspace:', workspaceId);
      fetchUserRoleInDocument(workspaceId);
    }
  }, [workspaceId, fetchUserRoleInDocument]);

  // ✅ Fetch documents when role is available (matching whiteboard pattern)
  useEffect(() => {
    if (workspaceId && userRole) {
      console.log('📄 Fetching documents for workspace:', workspaceId, 'with role:', userRole);
      fetchWorkspaceDocuments(workspaceId);
    }
  }, [workspaceId, userRole, fetchWorkspaceDocuments]);

  // ✅ Enhanced delete with permission check (matching whiteboard pattern)
  const handleDeleteDocument = async (documentId, documentTitle, documentCreatorId) => {
    // For members, check if they own the document
    const isOwner = documentCreatorId === user?._id;
    const canDeleteThis = canDeleteDocuments || (userRole === 'MEMBER' && isOwner);

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

  // ✅ Simplified open document (matching whiteboard pattern)
  const handleOpenDocument = (document) => {
    console.log('📄 Opening document:', document._id);
    setSelectedDocument(document);
    setShowEditor(true);
  };

  // ✅ Helper functions
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentPermissions = (document) => {
    const isOwner = document.creatorId?._id === user?._id || document.creatorId === user?._id;
    const canEditThis = canEdit || (userRole === 'MEMBER' && isOwner);
    const canDeleteThis = canDeleteDocuments || (userRole === 'MEMBER' && isOwner);
    
    return { canEdit: canEditThis, canDelete: canDeleteThis, isOwner };
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
      {/* Header with role-based actions (matching whiteboard pattern) */}
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
        
        {/* ✅ Create button with permission check (matching whiteboard pattern) */}
        {canCreateDocuments ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Document</span>
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

      {/* Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State (matching whiteboard pattern) */
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-4">
              {canCreateDocuments 
                ? 'Create your first document to start collaborating'
                : 'No documents available to view'}
            </p>
            {canCreateDocuments && (
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
                <div
                  key={document._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenDocument(document)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                      {document.title}
                    </h3>
                    {/* ✅ Only show delete button for owners/admins or document owners */}
                    {docPermissions.canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(document._id, document.title, document.creatorId?._id || document.creatorId);
                        }}
                        className="text-gray-400 hover:text-red-600 ml-2"
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  {/* Document content preview */}
                  {document.content && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {document.content.substring(0, 100)}...
                    </p>
                  )}
                  
                  {/* Document metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {document.content?.split(' ').length || 0} words
                    </span>
                    <span>
                      {formatDate(document.updatedAt)}
                    </span>
                  </div>
                  
                  {/* Creator info */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {document.creatorId?.profilePicture && (
                        <img
                          src={document.creatorId.profilePicture}
                          alt={document.creatorId.name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-xs text-gray-600">
                        {document.creatorId?.name || 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Permission indicators */}
                    <div className="flex items-center space-x-1">
                      {docPermissions.isOwner && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          Owner
                        </span>
                      )}
                      {docPermissions.canEdit && !docPermissions.isOwner && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          Can Edit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Only show create modal for non-members (matching whiteboard pattern) */}
      {canCreateDocuments && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workspaceId={workspaceId}
          userRole={userRole}
          onSuccess={(newDocument) => {
            setShowCreateModal(false);
            fetchWorkspaceDocuments(workspaceId);
            handleOpenDocument(newDocument);
          }}
        />
      )}
    </div>
  );
};

export default DocumentsList;