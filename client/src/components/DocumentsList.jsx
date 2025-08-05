import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore.js';
import CreateDocumentModal from './CreateDocumentModal.jsx';
import DocumentEditor from './DocumentEditor.jsx';

const DocumentsList = ({ workspaceId, workspace }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  
  const { 
    documents, 
    fetchWorkspaceDocuments, 
    deleteDocument,
    isLoading, 
    error,
    clearError 
  } = useDocumentStore();

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDocuments(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceDocuments]);

  const handleDeleteDocument = async (documentId, documentTitle) => {
    const confirmMessage = `Are you sure you want to delete "${documentTitle}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      const result = await deleteDocument(documentId);
      if (result.success) {
        // Close editor if the deleted document was open
        if (selectedDocument?._id === documentId) {
          setSelectedDocument(null);
          setShowEditor(false);
        }
      }
    }
  };

  const handleOpenDocument = (document) => {
    setSelectedDocument(document);
    setShowEditor(true);
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

  const getWordCount = (content) => {
    if (!content) return 0;
    return content.split(/\s+/).filter(word => word.length > 0).length;
  };

  if (showEditor && selectedDocument) {
    return (
      <DocumentEditor
        document={selectedDocument}
        workspaceId={workspaceId}
        onClose={() => {
          setShowEditor(false);
          setSelectedDocument(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600">Collaborative document editing for {workspace?.name}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + New Document
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first document</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <div key={document._id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{document.title}</h3>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => handleOpenDocument(document)}
                      className="text-gray-400 hover:text-indigo-600 p-1"
                      title="Open document"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(document._id, document.title)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete document"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  {document.content ? (
                    <p className="line-clamp-3">{document.content.substring(0, 100)}...</p>
                  ) : (
                    <p className="italic">No content yet</p>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Words: {document.metadata?.wordCount || getWordCount(document.content)}</span>
                    <span>Characters: {document.metadata?.characterCount || document.content?.length || 0}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <img
                      src={document.creatorId?.profilePicture || 'https://via.placeholder.com/20'}
                      alt={document.creatorId?.name || 'Creator'}
                      className="w-4 h-4 rounded-full"
                    />
                    <span>Created by {document.creatorId?.name || 'Unknown'}</span>
                  </div>
                  
                  <div>
                    <span>Last edited: {formatDate(document.updatedAt)}</span>
                  </div>
                  
                  {document.lastEditedBy && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={document.lastEditedBy?.profilePicture || 'https://via.placeholder.com/20'}
                        alt={document.lastEditedBy?.name || 'Editor'}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>by {document.lastEditedBy?.name || 'Unknown'}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenDocument(document)}
                  className="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Open Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateDocumentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
};

export default DocumentsList;