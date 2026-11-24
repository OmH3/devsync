import React, { useState, useEffect, useCallback, useRef } from 'react';
import FileExplorer from './FileExplorer.jsx';
import CodeEditor from './CodeEditor.jsx';
import { useFilesystemStore } from '../store/filesystemStore.js';
import { useCodeEditorStore } from '../store/codeeditorStore.js';
import { useSocket } from '../hooks/useSocket.js';


const CodeEditorMain = ({ workspaceId, workspace }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'editor-only', 'explorer-only'
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  //Real-time collaboration states
  const [isConnected, setIsConnected] = useState(false);
  const [workspaceUserCount, setWorkspaceUserCount] = useState(1);
  const [hasJoinedWorkspace, setHasJoinedWorkspace] = useState(false);

  //Refs for managing state
  const resizeRef = useRef(null);
  const isJoiningRef = useRef(false);

  //Hooks

  const socket = useSocket();

  const { 
    fileSystemItems,
    fetchWorkspaceFileSystem,
    error: fsError,
    isLoading: fsLoading,
    clearError: clearFsError
  } = useFilesystemStore();

  const {
    clearEditor,
    resetEditorState,
    error: editorError,
    clearError: clearEditorError
  } = useCodeEditorStore();

  //Initialize component
  useEffect(() => {
    console.log(' CodeEditorMain mounted for workspace:', workspaceId);

    // Reset states
    setSelectedFile(null);
    setShowEditor(false);
    setShowWelcome(true);
    setSearchQuery('');
    setHasJoinedWorkspace(false);
    setWorkspaceUserCount(1);

    // Clear editor state
    clearEditor();
    resetEditorState();

    // Fetch file system
    if (workspaceId) {
      fetchWorkspaceFileSystem(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceFileSystem, clearEditor, resetEditorState]);

  //Socket connection for workspace-level events
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const joinWorkspace = () => {
      if (isJoiningRef.current || hasJoinedWorkspace) return;

      console.log(' Joining workspace for code editor main:', workspaceId);
      isJoiningRef.current = true;
      socket.emit('join-workspace', workspaceId);

      setTimeout(() => {
        isJoiningRef.current = false;
      }, 5000);
    };

    const leaveWorkspace = () => {
      if (!hasJoinedWorkspace) return;
      console.log(' Leaving workspace from code editor main:', workspaceId);
      socket.emit('leave-workspace', workspaceId);
      setHasJoinedWorkspace(false);
      setWorkspaceUserCount(1);
    };

    //Socket event handlers
    const handleWorkspaceJoined = (data) => {
      console.log(' Joined workspace for code editor main:', data);
      setHasJoinedWorkspace(true);
      setWorkspaceUserCount(data.userCount || 1);
      isJoiningRef.current = false;
    };

    const handleWorkspaceUserCount = (payload) => {
      const count = typeof payload === 'object' && payload !== null ? payload.userCount : payload;
      if (typeof count === 'number') setWorkspaceUserCount(count);
    };

    const handleConnect = () => {
      console.log(' Socket connected for code editor main');
      setIsConnected(true);
      joinWorkspace();
    };

    const handleDisconnect = () => {
      console.log(' Socket disconnected from code editor main');
      setIsConnected(false);
      setHasJoinedWorkspace(false);
      setWorkspaceUserCount(1);
      isJoiningRef.current = false;
    };

    //Check initial connection and attach listeners
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('workspace-joined', handleWorkspaceJoined);
    socket.on('workspace-user-count', handleWorkspaceUserCount);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('workspace-joined', handleWorkspaceJoined);
      socket.off('workspace-user-count', handleWorkspaceUserCount);
      leaveWorkspace();
    };
  }, [socket, workspaceId, hasJoinedWorkspace]);

  //Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (file.type !== 'file') return;

    console.log(' File selected:', file.name);
    setSelectedFile(file);
    setShowEditor(true);
    setShowWelcome(false);
  }, []);

  //Handle editor close with confirmation if unsaved changes
  const handleCloseEditor = useCallback((hasUnsavedChanges = false) => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close this editor?'
      );
      if (!shouldClose) return false;
    }

    console.log(' Closing code editor');
    setShowEditor(false);
    setSelectedFile(null);
    setShowWelcome(true);
    clearEditor();
    return true;
  }, [clearEditor]);

  //Handle sidebar resize
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;

    const newWidth = Math.min(Math.max(e.clientX, 200), 600);
    setSidebarWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  //Filter files based on search
  const filteredFiles = fileSystemItems.filter(file => 
    file.type === 'file' && 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  //Get file icon
  const getFileIcon = (file) => {
    const ext = file.metadata?.extension?.toLowerCase();
    const icons = {
      'js': 'JS', 'jsx': 'JS',
      'py': 'PY', 'cpp': 'C+', 'cc': 'C+', 'cxx': 'C+', 'hpp': 'C+'
    };
    return icons[ext] || '📄';
  };

  //Handle view mode changes
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'editor-only' && !showEditor) {
      setShowWelcome(true);
    }
  };

  //If showing editor, render full editor view
  if (showEditor && selectedFile && viewMode !== 'explorer-only') {
    if (viewMode === 'editor-only') {
      return (
        <CodeEditor
          fileItem={selectedFile}
          workspaceId={workspaceId}
          onClose={handleCloseEditor}
        />
      );
    }

    // Split view with editor
    return (
      <div className="h-full flex bg-gray-50">
        {/* File Explorer Sidebar */}
        <div 
          className="bg-white border-r border-gray-200 flex flex-col"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Sidebar Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Layout</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleViewModeChange('split')}
                  className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Split View"
                >
                  Split
                </button>
                <button
                  onClick={() => handleViewModeChange('editor-only')}
                  className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'editor-only' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Editor Only"
                >
                  Full
                </button>
              </div>
            </div>
          </div>

          <FileExplorer
            workspaceId={workspaceId}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className={`w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors ${
            isResizing ? 'bg-blue-400' : ''
          }`}
          onMouseDown={handleMouseDown}
        />

        {/* Editor Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <CodeEditor
            fileItem={selectedFile}
            workspaceId={workspaceId}
            onClose={handleCloseEditor}
          />
        </div>
      </div>
    );
  }

  //Main view (welcome screen or explorer-only)
  return (
    <div className="h-full flex bg-gray-50">
      {/* File Explorer Sidebar (always visible unless editor-only) */}
      {viewMode !== 'editor-only' && (
        <>
          <div 
            className="bg-white border-r border-gray-200 flex flex-col"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Sidebar Header */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Layout</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewModeChange('split')}
                    className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Split View"
                  >
                    Split
                  </button>
                  <button
                    onClick={() => handleViewModeChange('explorer-only')}
                    className={`px-2 py-1 rounded text-xs font-medium ${viewMode === 'explorer-only' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Explorer Only"
                  >
                    Tree
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Search Results or File Explorer */}
            {searchQuery ? (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Search Results ({filteredFiles.length})
                  </h4>
                </div>

                {filteredFiles.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-gray-400 mb-2"></div>
                    <p className="text-sm">No files found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredFiles.map(file => (
                      <button
                        key={file._id}
                        onClick={() => handleFileSelect(file)}
                        className="w-full flex items-center space-x-3 p-2 text-left rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm flex-shrink-0">{getFileIcon(file)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {file.path}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <FileExplorer
                workspaceId={workspaceId}
                onFileSelect={handleFileSelect}
              />
            )}
          </div>

          {/* Resize Handle */}
          <div
            ref={resizeRef}
            className={`w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors ${
              isResizing ? 'bg-blue-400' : ''
            }`}
            onMouseDown={handleMouseDown}
          />
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Code Editor</h1>
              <p className="text-sm text-gray-600 mt-1">
                Collaborative development environment for {workspace?.name || 'your workspace'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Connection indicator */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected && hasJoinedWorkspace ? 'bg-green-500' : 
                  isConnected ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span>{workspaceUserCount} online</span>
              </div>

              {/* View mode toggle */}
              {viewMode === 'editor-only' && (
                <button
                  onClick={() => handleViewModeChange('split')}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Show Explorer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(fsError || editorError) && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm text-red-700">{fsError || editorError}</div>
              </div>
              <div className="ml-auto flex items-center space-x-2">
                {fsError && (
                  <button
                    onClick={clearFsError}
                    className="text-red-400 hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
                {editorError && (
                  <button
                    onClick={clearEditorError}
                    className="text-red-400 hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {fsLoading && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-sm text-blue-700">Loading workspace files...</span>
            </div>
          </div>
        )}

        {/* Welcome Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showWelcome ? (
            <div className="max-w-6xl mx-auto">
              {/* Welcome Hero */}
              <div className="text-center mb-12">
                <div className="text-gray-400 mb-6">
                  <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Code Editor
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Collaborative code editing with real-time execution, syntax highlighting, 
                  and seamless team collaboration. Start coding together!
                </p>

                {/* Getting Started Steps */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Getting Started</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        1
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Create Files</h4>
                      <p className="text-sm text-gray-600">Use the file explorer to create new files and organize your code</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        2
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Write Code</h4>
                      <p className="text-sm text-gray-600">Open a file to edit its contents and track save status.</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        3
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Execute & Share</h4>
                      <p className="text-sm text-gray-600">Share edits with your team. Code execution depends on deployment capabilities.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No File Selected</h3>
              <p className="text-gray-600 mb-6">
                Choose a file from the explorer to start coding
              </p>
              <button
                onClick={() => setShowWelcome(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Back to Welcome
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditorMain;
