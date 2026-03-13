import React, { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '../store/documentStore.js';
import { useAuth } from '../hooks/useAuth.js';

const CreateDocumentModal = ({ isOpen, onClose, workspaceId, userRole, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const titleInputRef = useRef(null);
  const { user } = useAuth();
  const { createDocument, isLoading, error, clearError } = useDocumentStore();

  //Auto-focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  //Permission check
  const canCreateDocument = userRole && ['OWNER', 'ADMIN'].includes(userRole);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    clearError();
  };

  //Enhanced validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Document title is required';
    } else if (formData.title.trim().length < 2) {
      errors.title = 'Title must be at least 2 characters long';
    } else if (formData.title.length > 255) {
      errors.title = 'Title must be less than 255 characters';
    } else if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(formData.title.trim())) {
      errors.title = 'Title can only contain letters, numbers, spaces, hyphens, underscores, and dots';
    }

    // Optional content validation
    if (formData.content && formData.content.length > 50000) {
      errors.content = 'Initial content must be less than 50,000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  //Enhanced form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canCreateDocument) {
      alert('You do not have permission to create documents');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      console.log(' Creating new document:', {
        title: formData.title.trim(),
        contentLength: formData.content.length,
        workspaceId,
        userRole
      });

      const result = await createDocument({
        title: formData.title.trim(),
        content: formData.content.trim(),
        workspaceId //Ensure workspace ID is included
      });
      
      if (result.success) {
        console.log(' Document created successfully:', result.document);
        
        // Reset form
        setFormData({ title: '', content: '' });
        setValidationErrors({});
        
        // Call success callback with the new document
        if (onSuccess) {
          onSuccess(result.document);
        }
        
        // Close modal
        onClose();
      } else {
        console.error(' Failed to create document:', result.error);
      }
    } catch (error) {
      console.error(' Error creating document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  //Enhanced modal close
  const handleClose = () => {
    if (isSubmitting) {
      const confirmClose = window.confirm('Document is being created. Are you sure you want to close?');
      if (!confirmClose) return;
    }

    setFormData({ title: '', content: '' });
    setValidationErrors({});
    clearError();
    onClose();
  };

  //Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/*  Enhanced header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create New Document</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create a collaborative document for your team
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*  Permission warning */}
        {!canCreateDocument && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  You do not have permission to create documents in this workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
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
                
              </button>
            </div>
          </div>
        )}

        {/*  Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <input
              ref={titleInputRef}
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter a descriptive title for your document"
              disabled={!canCreateDocument || isSubmitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                validationErrors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              maxLength={255}
            />
            {validationErrors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.title}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/255 characters
            </p>
          </div>
          
          {/* Content Input */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Initial Content (Optional)
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              value={formData.content}
              onChange={handleChange}
              placeholder="Start with some initial content, or leave blank to start fresh..."
              disabled={!canCreateDocument || isSubmitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical ${
                validationErrors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
            />
            {validationErrors.content && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.content}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.content.length.toLocaleString()}/50,000 characters
            </p>
          </div>

          {/*  User info */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {user?.name || user?.email || 'Unknown User'}
                </p>
                <p className="text-gray-600">Document Creator • Role: {userRole}</p>
              </div>
            </div>
          </div>

          {/*  Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={!canCreateDocument || isSubmitting || isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Document</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 px-4 py-2 rounded-md text-sm font-medium disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDocumentModal;