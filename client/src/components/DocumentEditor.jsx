import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { useDocumentStore } from '../store/documentStore.js';
import { useAuth } from '../hooks/useAuth.js';

const DocumentEditor = ({ document, workspaceId, onClose }) => {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [userCount, setUserCount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [hasJoinedDocument, setHasJoinedDocument] = useState(false);
  const [error, setError] = useState('');

  // ✅ Refs for managing state without triggering effects
  const saveTimeoutRef = useRef(null);
  const isUpdatingFromSocketRef = useRef(false);
  const lastSavedContentRef = useRef({ title: '', content: '' });
  const titleInputRef = useRef(null);
  const contentTextareaRef = useRef(null);
  const lastBroadcastRef = useRef({ title: '', content: '' });
  const pendingSaveRef = useRef(false);
  const isJoiningRef = useRef(false);

  // Hooks
  const { user } = useAuth();
  const socket = useSocket();
  const { 
    saveDocumentContent,
    fetchUserRoleInDocument,
    updateDocumentContentFromSocket,
    handleUserJoined,
    handleUserLeft,
    // ✅ Get permissions from store
    userRole,
    canEdit,
    canView,
    canCreate,
    canDelete,
    isWorkspaceOwner,
    isAdmin
  } = useDocumentStore();

  // ✅ Reset document state when document changes or component mounts
  useEffect(() => {
    // Reset all document-specific state
    setHasJoinedDocument(false);
    setActiveUsers([]);
    setUserCount(1);
    setError('');
    setTitle(document?.title || '');
    setContent(document?.content || '');
    setHasUnsavedChanges(false);
    setLastSaved(null);
    
    // Reset refs
    isJoiningRef.current = false;
    lastBroadcastRef.current = { title: '', content: '' };
    lastSavedContentRef.current = { title: '', content: '' };
    
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Update connection status based on socket
    setIsConnected(socket?.connected || false);
    
  }, [document._id, socket]);

  // ✅ FIX: Fetch WORKSPACE permissions, not document permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!workspaceId || !user?._id) {
        return;
      }

      try {
        // ✅ FIX: Pass workspaceId instead of document._id
        const result = await fetchUserRoleInDocument(workspaceId);
        
        if (result.success) {
          // Permissions loaded successfully
        } else {
          setError('Failed to load workspace permissions');
          console.error('❌ Error fetching workspace permissions:', result.error);
        }
      } catch (error) {
        console.error('❌ Error fetching workspace permissions:', error);
        setError('Failed to load workspace permissions');
      }
    };

    fetchPermissions();
  }, [workspaceId, user?._id, fetchUserRoleInDocument]); // ✅ Changed dependency from document._id to workspaceId

  // ✅ Update counts when content changes
  useEffect(() => {
    updateCounts(content);
  }, [content]);

  const updateCounts = useCallback((text) => {
    setCharCount(text.length);
    setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
  }, []);

  // ✅ Enhanced permission check for document ownership
  const getDocumentPermissions = useCallback(() => {
    // ✅ Check if user is document owner
    const isDocumentOwner = document?.creatorId?._id === user?._id || 
                           document?.creatorId === user?._id;
    
    // ✅ Enhanced permission logic
    const hasWorkspaceEditPermission = canEdit; // From workspace role
    const canEditThisDocument = hasWorkspaceEditPermission || 
                               (userRole === 'MEMBER' && isDocumentOwner);
    
    return {
      canEdit: canEditThisDocument,
      canView: canView,
      isDocumentOwner,
      canDelete: canDelete || (userRole === 'MEMBER' && isDocumentOwner)
    };
  }, [canEdit, canView, canDelete, userRole, document?.creatorId, user?._id]);

  // ✅ Get current document permissions
  const documentPermissions = getDocumentPermissions();

  // ✅ Improved joinDocument function
  const joinDocument = useCallback(() => {
    if (isJoiningRef.current) {
      return;
    }

    if (!socket || !socket.connected) {
      return;
    }

    if (hasJoinedDocument) {
      return;
    }

    if (!document._id || !user._id) {
      return;
    }

    isJoiningRef.current = true;
    socket.emit('join-doc', document._id);
    
    setTimeout(() => {
      isJoiningRef.current = false;
    }, 5000);
    
  }, [socket, document._id, hasJoinedDocument, user._id]);

  // ✅ Leave document function
  const leaveDocument = useCallback(() => {
    if (!socket || !hasJoinedDocument || !document._id) return;
    
    socket.emit('leave-doc', document._id);
    setHasJoinedDocument(false);
    setActiveUsers([]);
    setUserCount(1);
    isJoiningRef.current = false;
  }, [socket, document._id, hasJoinedDocument]);

  // ✅ Setup socket listeners (same as before, no changes needed here)
  const setupSocketListeners = useCallback(() => {
    if (!socket) {
      return;
    }

    const handleDocJoined = (data) => {
      setHasJoinedDocument(true);
      setUserCount(data.userCount || 1);
      setError('');
      isJoiningRef.current = false;
    };

    const handleDocTextChanged = (data) => {
      if (data.userId === user._id) {
        return;
      }
      
      isUpdatingFromSocketRef.current = true;
      
      if (data.title !== undefined && data.title !== title) {
        setTitle(data.title);
      }
      
      if (data.content !== undefined && data.content !== content) {
        setContent(data.content);
      }
      
      updateDocumentContentFromSocket(document._id, data.title, data.content, data.userId);
      
      setTimeout(() => {
        isUpdatingFromSocketRef.current = false;
      }, 100);
    };

    const handleUserJoinedDoc = (data) => {
      console.log('👤 User joined document:', data);
      setActiveUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
      handleUserJoined(data);
    };

    const handleUserLeftDoc = (data) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      handleUserLeft(data);
    };

    const handleUserCount = (count) => {
      setUserCount(count);
    };

    const handleDocSaved = (data) => {
      if (data.userId !== user._id) {
        setLastSaved(new Date(data.timestamp));
        if (!hasUnsavedChanges) {
          lastSavedContentRef.current = {
            title: data.title || title,
            content: data.content || content
          };
        }
      }
    };

    const handleDocAutoSaved = (data) => {
      console.log('💾 Document auto-saved by another user:', data);
      if (data.userId !== user._id) {
        setLastSaved(new Date(data.timestamp));
      }
    };

    const handleSocketError = (error) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'Socket error occurred');
      isJoiningRef.current = false;
    };

    socket.on('doc-joined', handleDocJoined);
    socket.on('doc-text-changed', handleDocTextChanged);
    socket.on('user-joined-doc', handleUserJoinedDoc);
    socket.on('user-left-doc', handleUserLeftDoc);
    socket.on('user-count', handleUserCount);
    socket.on('doc-saved', handleDocSaved);
    socket.on('doc-auto-saved', handleDocAutoSaved);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('doc-joined', handleDocJoined);
      socket.off('doc-text-changed', handleDocTextChanged);
      socket.off('user-joined-doc', handleUserJoinedDoc);
      socket.off('user-left-doc', handleUserLeftDoc);
      socket.off('user-count', handleUserCount);
      socket.off('doc-saved', handleDocSaved);
      socket.off('doc-auto-saved', handleDocAutoSaved);
      socket.off('error', handleSocketError);
    };

  }, [socket, user._id, title, content, document._id, updateDocumentContentFromSocket, handleUserJoined, handleUserLeft, hasUnsavedChanges]);

  // ✅ Socket connection effects (same as before)
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      setHasJoinedDocument(false);
      return;
    }

    const handleConnect = () => {
      console.log('✅ Socket connected, updating status');
      setIsConnected(true);
      
      if (!hasJoinedDocument && !isJoiningRef.current) {
        console.log('🔄 Auto-joining document after connection');
        setTimeout(() => joinDocument(), 200);
      }
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setHasJoinedDocument(false);
      setActiveUsers([]);
      setUserCount(1);
      isJoiningRef.current = false;
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, hasJoinedDocument, joinDocument]);

  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up socket listeners');
    const cleanup = setupSocketListeners();
    
    if (socket.connected && !hasJoinedDocument && !isJoiningRef.current) {
      console.log('🔄 Socket ready, attempting to join document');
      setTimeout(() => joinDocument(), 100);
    }

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      if (cleanup) cleanup();
      leaveDocument();
    };
  }, [socket, setupSocketListeners, joinDocument, leaveDocument, hasJoinedDocument]);

  // ✅ Smart broadcast with enhanced permission check
  const broadcastChange = useCallback((newTitle, newContent) => {
    if (!socket || !socket.connected || !hasJoinedDocument || isUpdatingFromSocketRef.current) {
      return;
    }

    // ✅ Only broadcast if user can edit AND content actually changed
    if (!documentPermissions.canEdit) {
      console.log('❌ Cannot broadcast: No edit permission');
      return;
    }

    if (
      newTitle === lastBroadcastRef.current.title && 
      newContent === lastBroadcastRef.current.content
    ) {
      return;
    }

    console.log('📡 Broadcasting text change with permission check passed');
    socket.emit('doc-text-change', {
      docId: document._id,
      title: newTitle,
      content: newContent,
      operation: 'update',
      timestamp: Date.now()
    });

    lastBroadcastRef.current = {
      title: newTitle,
      content: newContent
    };
  }, [socket, document._id, hasJoinedDocument, documentPermissions.canEdit]);

  // ✅ Enhanced auto-save with document-specific permission check
  const autoSave = useCallback(async () => {
    console.log('💾 Auto-save triggered with permissions:', {
      canEdit: documentPermissions.canEdit,
      userRole,
      isDocumentOwner: documentPermissions.isDocumentOwner
    });
    
    if (!documentPermissions.canEdit) {
      console.log('❌ Auto-save skipped: No edit permission for this document');
      return;
    }

    if (pendingSaveRef.current) {
      console.log('⏳ Save already in progress, skipping');
      return;
    }

    const currentTitle = title.trim();
    const currentContent = content;
    
    if (
      currentTitle === lastSavedContentRef.current.title && 
      currentContent === lastSavedContentRef.current.content
    ) {
      console.log('💾 No changes to save');
      return;
    }

    if (!currentTitle) {
      console.log('❌ Auto-save skipped: No title');
      return;
    }

    pendingSaveRef.current = true;
    setIsSaving(true);

    try {
      console.log('💾 Auto-saving document with enhanced permissions...');
      const result = await saveDocumentContent(document._id, currentTitle, currentContent);
      
      if (result.success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setError('');
        
        lastSavedContentRef.current = {
          title: currentTitle,
          content: currentContent
        };

        if (socket && socket.connected && hasJoinedDocument) {
          socket.emit('doc-auto-save', {
            docId: document._id,
            title: currentTitle,
            content: currentContent
          });
        }

        console.log('✅ Auto-save successful');
      } else {
        console.error('❌ Auto-save failed:', result.error);
        setError(result.error || 'Auto-save failed');
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
      setError('Auto-save failed');
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  }, [title, content, documentPermissions.canEdit, saveDocumentContent, document._id, socket, hasJoinedDocument, userRole]);

  // ✅ Debounced save with document permission check
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (documentPermissions.canEdit) {
      saveTimeoutRef.current = setTimeout(autoSave, 1500);
    } else {
      console.log('❌ Debounced save skipped: No edit permission');
    }
  }, [autoSave, documentPermissions.canEdit]);

  // ✅ Enhanced title change handler
  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    
    // ✅ Always allow local state update for real-time display
    setTitle(newTitle);
    
    console.log('📝 Title change - permissions check:', {
      canEdit: documentPermissions.canEdit,
      userRole,
      isDocumentOwner: documentPermissions.isDocumentOwner
    });
    
    if (!documentPermissions.canEdit) {
      console.log('👁️ Read-only user viewing title change');
      return;
    }

    setHasUnsavedChanges(true);
    setError('');
    
    broadcastChange(newTitle, content);
    debouncedSave();
  }, [documentPermissions.canEdit, content, broadcastChange, debouncedSave, userRole]);

  // ✅ Enhanced content change handler
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    
    // ✅ Always allow local state update for real-time display
    setContent(newContent);
    
    console.log('📝 Content change - permissions check:', {
      canEdit: documentPermissions.canEdit,
      userRole,
      isDocumentOwner: documentPermissions.isDocumentOwner
    });
    
    if (!documentPermissions.canEdit) {
      console.log('👁️ Read-only user viewing content change');
      return;
    }

    setHasUnsavedChanges(true);
    setError('');
    
    broadcastChange(title, newContent);
    debouncedSave();
  }, [documentPermissions.canEdit, title, broadcastChange, debouncedSave, userRole]);

  // ✅ Enhanced manual save
  const handleManualSave = useCallback(async () => {
    console.log('💾 Manual save triggered with permissions:', {
      canEdit: documentPermissions.canEdit,
      userRole,
      isDocumentOwner: documentPermissions.isDocumentOwner
    });
    
    if (!documentPermissions.canEdit) {
      setError('You do not have permission to edit this document');
      return;
    }

    if (!title.trim()) {
      setError('Document title is required');
      return;
    }

    if (!hasUnsavedChanges) {
      console.log('💾 No unsaved changes to save');
      return;
    }

    if (pendingSaveRef.current) {
      console.log('⏳ Save already in progress');
      return;
    }

    pendingSaveRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      console.log('💾 Manual save initiated with enhanced permissions');
      const result = await saveDocumentContent(document._id, title.trim(), content);
      
      if (result.success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        lastSavedContentRef.current = {
          title: title.trim(),
          content: content
        };

        if (socket && socket.connected && hasJoinedDocument) {
          socket.emit('doc-save', {
            docId: document._id,
            title: title.trim(),
            content: content
          });
        }

        console.log('✅ Manual save successful');
      } else {
        setError(result.error || 'Save failed');
        console.error('❌ Manual save failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Manual save error:', error);
      setError('Failed to save document');
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  }, [documentPermissions.canEdit, title, content, hasUnsavedChanges, saveDocumentContent, document._id, socket, hasJoinedDocument, userRole]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 DocumentEditor unmounting, cleaning up');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      leaveDocument();
    };
  }, [leaveDocument]);

  // ✅ Helper functions
  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    return lastSaved.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConnectionStatus = () => {
    if (!socket) return { status: 'No Socket', color: 'bg-red-500', icon: '❌' };
    if (!isConnected) return { status: 'Connecting...', color: 'bg-yellow-500', icon: '🔄' };
    if (isJoiningRef.current) return { status: 'Joining...', color: 'bg-yellow-500', icon: '🔄' };
    if (!hasJoinedDocument) return { status: 'Joining Document...', color: 'bg-yellow-500', icon: '🔄' };
    return { status: 'Connected', color: 'bg-green-500', icon: '✅' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Document title..."
              readOnly={!documentPermissions.canEdit}
              className={`text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${
                !documentPermissions.canEdit ? 'cursor-default opacity-80' : ''
              }`}
              style={{ width: `${Math.max(title.length, 20)}ch` }}
            />
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>
                {isSaving ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-1"></div>
                    Saving...
                  </span>
                ) : (
                  `Last saved: ${formatLastSaved()}`
                )}
              </span>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus.color}`}></div>
                <span className="text-xs">{connectionStatus.status}</span>
              </div>

              <div className="flex items-center space-x-1">
                <span>👥</span>
                <span className="font-medium">{userCount}</span>
                <span>user{userCount !== 1 ? 's' : ''}</span>
              </div>

              {/* ✅ Enhanced permission indicator */}
              <div className="flex items-center space-x-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${
                  userRole === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                  userRole === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {userRole}
                </span>
                
                {documentPermissions.isDocumentOwner && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    Doc Owner
                  </span>
                )}
                
                {!documentPermissions.canEdit && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full flex items-center">
                    <span className="mr-1">👁️</span>
                    Read Only
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="mr-4">{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          
          {hasUnsavedChanges && documentPermissions.canEdit && (
            <div className="flex items-center text-xs text-orange-600 font-medium">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
              Unsaved changes
            </div>
          )}
          
          {documentPermissions.canEdit && (
            <button
              onClick={handleManualSave}
              disabled={isSaving || !hasUnsavedChanges || pendingSaveRef.current}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {activeUsers.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-2">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-blue-700 font-medium">Currently editing:</span>
            {activeUsers.map((activeUser, index) => (
              <span key={activeUser.userId} className="text-blue-600">
                {activeUser.userName}
                {index < activeUsers.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Enhanced read-only banner */}
      {!documentPermissions.canEdit && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg">👁️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>View-Only Mode:</strong> 
                {userRole === 'MEMBER' && !documentPermissions.isDocumentOwner ? (
                  " You can only edit documents you created. This document belongs to another user."
                ) : (
                  " You can see real-time changes but cannot edit this document. Contact the document owner or workspace admin for edit access."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          ref={contentTextareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder={
            documentPermissions.canEdit 
              ? "Start writing your document..." 
              : "This document is read-only - you can see real-time changes from other users"
          }
          readOnly={!documentPermissions.canEdit}
          className={`w-full h-full resize-none border-none focus:outline-none focus:ring-0 text-gray-900 text-base leading-relaxed transition-colors ${
            !documentPermissions.canEdit 
              ? 'cursor-default bg-gray-50 opacity-90' 
              : 'bg-white'
          }`}
          style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span>Document ID: {document._id?.slice(-8)}</span>
          <span className="ml-4">Active users: {userCount}</span>
          <span className="ml-4">Role: {userRole}</span>
          {documentPermissions.isDocumentOwner && (
            <span className="ml-4 text-orange-600">👑 Owner</span>
          )}
          {!documentPermissions.canEdit && (
            <span className="ml-4 text-yellow-600">👁️ View-only</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSaving ? 'bg-blue-100 text-blue-800' : 
            hasUnsavedChanges && documentPermissions.canEdit ? 'bg-orange-100 text-orange-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                Saving...
              </>
            ) : hasUnsavedChanges && documentPermissions.canEdit ? (
              'Unsaved'
            ) : (
              'Saved'
            )}
          </span>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            connectionStatus.status === 'Connected' ? 'bg-green-100 text-green-800' :
            connectionStatus.status.includes('Connecting') || connectionStatus.status.includes('Joining') ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus.icon} {connectionStatus.status}
          </span>
        </div>
      </div>

      {/* ✅ Enhanced debug info */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-30">
        Socket: {socket ? '✅' : '❌'} | 
        Connected: {isConnected ? '✅' : '❌'} | 
        Joined: {hasJoinedDocument ? '✅' : '❌'} |
        Role: {userRole || 'None'} |
        Edit: {documentPermissions.canEdit ? '✅' : '❌'} |
        DocOwner: {documentPermissions.isDocumentOwner ? '✅' : '❌'} |
        Saving: {isSaving ? '⏳' : '✅'}
      </div>
    </div>
  );
};

export default DocumentEditor;