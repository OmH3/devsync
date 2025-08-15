import React, { useState, useEffect, useCallback, useRef } from 'react';
import FileExplorer from './FileExplorer.jsx';
import CodeEditor from './CodeEditor.jsx';
import { useFilesystemStore } from '../store/filesystemStore.js';
import { useCodeEditorStore } from '../store/codeeditorStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../hooks/useAuth.js';

const CodeEditorMain = ({ workspaceId, workspace }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'editor-only', 'explorer-only'
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  // ✅ Real-time collaboration states
  const [isConnected, setIsConnected] = useState(false);
  const [globalActiveUsers, setGlobalActiveUsers] = useState([]);
  const [workspaceUserCount, setWorkspaceUserCount] = useState(1);
  const [hasJoinedWorkspace, setHasJoinedWorkspace] = useState(false);

  // ✅ Refs for managing state
  const resizeRef = useRef(null);
  const isJoiningRef = useRef(false);

  // ✅ Hooks
  const { user } = useAuth();
  const socket = useSocket();
  
  const { 
    fileSystemItems,
    fetchWorkspaceFileSystem,
    createFileSystemItem,
    permissions,
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

  // ✅ Initialize component
  useEffect(() => {
    console.log('🚀 CodeEditorMain mounted for workspace:', workspaceId);
    
    // Reset states
    setSelectedFile(null);
    setShowEditor(false);
    setShowWelcome(true);
    setSearchQuery('');
    setHasJoinedWorkspace(false);
    setGlobalActiveUsers([]);
    setWorkspaceUserCount(1);
    
    // Clear editor state
    clearEditor();
    resetEditorState();
    
    // Fetch file system
    if (workspaceId) {
      fetchWorkspaceFileSystem(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceFileSystem, clearEditor, resetEditorState]);

  // ✅ Socket connection for workspace-level events
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const joinWorkspace = () => {
      if (isJoiningRef.current || hasJoinedWorkspace) return;
      
      console.log('🌐 Joining workspace for code editor main:', workspaceId);
      isJoiningRef.current = true;
      socket.emit('join-workspace', workspaceId);
      
      setTimeout(() => {
        isJoiningRef.current = false;
      }, 5000);
    };

    const leaveWorkspace = () => {
      if (!hasJoinedWorkspace) return;
      console.log('🚪 Leaving workspace from code editor main:', workspaceId);
      socket.emit('leave-workspace', workspaceId);
      setHasJoinedWorkspace(false);
      setGlobalActiveUsers([]);
      setWorkspaceUserCount(1);
    };

    // ✅ Socket event handlers
    const handleWorkspaceJoined = (data) => {
      console.log('✅ Joined workspace for code editor main:', data);
      setHasJoinedWorkspace(true);
      setWorkspaceUserCount(data.userCount || 1);
      isJoiningRef.current = false;
    };

    const handleUserJoinedWorkspace = (userData) => {
      console.log('👤 User joined workspace:', userData);
      setGlobalActiveUsers(prev => [...prev.filter(u => u.userId !== userData.userId), userData]);
    };

    const handleUserLeftWorkspace = (userData) => {
      console.log('👋 User left workspace:', userData);
      setGlobalActiveUsers(prev => prev.filter(u => u.userId !== userData.userId));
    };

    const handleWorkspaceUserCount = (count) => {
      console.log('👥 Workspace user count:', count);
      setWorkspaceUserCount(count);
    };

    const handleConnect = () => {
      console.log('✅ Socket connected for code editor main');
      setIsConnected(true);
      joinWorkspace();
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected from code editor main');
      setIsConnected(false);
      setHasJoinedWorkspace(false);
      setGlobalActiveUsers([]);
      setWorkspaceUserCount(1);
      isJoiningRef.current = false;
    };

    // ✅ Check initial connection and attach listeners
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('workspace-joined', handleWorkspaceJoined);
    socket.on('user-joined-workspace', handleUserJoinedWorkspace);
    socket.on('user-left-workspace', handleUserLeftWorkspace);
    socket.on('user-count', handleWorkspaceUserCount);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('workspace-joined', handleWorkspaceJoined);
      socket.off('user-joined-workspace', handleUserJoinedWorkspace);
      socket.off('user-left-workspace', handleUserLeftWorkspace);
      socket.off('user-count', handleWorkspaceUserCount);
      leaveWorkspace();
    };
  }, [socket, workspaceId, hasJoinedWorkspace]);

  // ✅ Load recent files from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem(`recent-files-${workspaceId}`);
    if (savedRecent) {
      try {
        setRecentFiles(JSON.parse(savedRecent));
      } catch (error) {
        console.error('Failed to parse recent files:', error);
      }
    }
  }, [workspaceId]);

  // ✅ Handle file selection with recent files tracking
  const handleFileSelect = useCallback((file) => {
    if (file.type !== 'file') return;
    
    console.log('📄 File selected:', file.name);
    setSelectedFile(file);
    setShowEditor(true);
    setShowWelcome(false);
    
    // Add to recent files
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f._id !== file._id);
      const updated = [file, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem(`recent-files-${workspaceId}`, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  // ✅ Handle editor close with confirmation if unsaved changes
  const handleCloseEditor = useCallback((hasUnsavedChanges = false) => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close this editor?'
      );
      if (!shouldClose) return false;
    }
    
    console.log('🔚 Closing code editor');
    setShowEditor(false);
    setSelectedFile(null);
    setShowWelcome(true);
    clearEditor();
    return true;
  }, [clearEditor]);

  // ✅ Handle file creation with automatic opening
  const handleCreateFile = useCallback(async (fileName, fileType = 'file', parentId = null) => {
    if (!fileName.trim()) return null;

    const result = await createFileSystemItem({
      name: fileName.trim(),
      type: fileType,
      parentId,
      workspaceId
    });

    if (result.success && result.item.type === 'file') {
      // Auto-open newly created files
      setTimeout(() => {
        handleFileSelect(result.item);
      }, 100);
    }

    return result;
  }, [createFileSystemItem, workspaceId, handleFileSelect]);

  // ✅ Handle sidebar resize
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

  // ✅ Filter files based on search
  const filteredFiles = fileSystemItems.filter(file => 
    file.type === 'file' && 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Get file language for syntax highlighting preview
  const getFileLanguage = (file) => {
    const ext = file.metadata?.extension?.toLowerCase();
    const langMap = {
      'js': 'JavaScript', 'jsx': 'React', 'ts': 'TypeScript', 'tsx': 'TypeScript React',
      'py': 'Python', 'java': 'Java', 'cpp': 'C++', 'c': 'C',
      'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'json': 'JSON',
      'md': 'Markdown', 'php': 'PHP', 'rb': 'Ruby', 'go': 'Go'
    };
    return langMap[ext] || 'Text';
  };

  // ✅ Get file icon
  const getFileIcon = (file) => {
    const ext = file.metadata?.extension?.toLowerCase();
    const icons = {
      'js': '🟨', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
      'html': '🌐', 'css': '🎨', 'scss': '🎨', 'json': '📋',
      'md': '📝', 'php': '🐘', 'rb': '💎', 'go': '🐹'
    };
    return icons[ext] || '📄';
  };

  // ✅ Quick Actions Component
  const QuickActions = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCreateFile('script.js')}
          className="flex items-center space-x-2 p-3 text-left rounded-lg border border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
        >
          <span className="text-xl">🟨</span>
          <div>
            <div className="font-medium text-sm">New JavaScript</div>
            <div className="text-xs text-gray-500">Create JS file</div>
          </div>
        </button>
        
        <button
          onClick={() => handleCreateFile('script.py')}
          className="flex items-center space-x-2 p-3 text-left rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
        >
          <span className="text-xl">🐍</span>
          <div>
            <div className="font-medium text-sm">New Python</div>
            <div className="text-xs text-gray-500">Create PY file</div>
          </div>
        </button>
        
        <button
          onClick={() => handleCreateFile('index.html')}
          className="flex items-center space-x-2 p-3 text-left rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <span className="text-xl">🌐</span>
          <div>
            <div className="font-medium text-sm">New HTML</div>
            <div className="text-xs text-gray-500">Create HTML file</div>
          </div>
        </button>
        
        <button
          onClick={() => handleCreateFile('style.css')}
          className="flex items-center space-x-2 p-3 text-left rounded-lg border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-colors"
        >
          <span className="text-xl">🎨</span>
          <div>
            <div className="font-medium text-sm">New CSS</div>
            <div className="text-xs text-gray-500">Create CSS file</div>
          </div>
        </button>
      </div>
    </div>
  );

  // ✅ Recent Files Component
  const RecentFiles = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h4 className="font-medium text-gray-900 mb-4">Recent Files</h4>
      {recentFiles.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <div className="text-gray-400 mb-2">📁</div>
          <p className="text-sm">No recent files</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentFiles.slice(0, 5).map(file => (
            <button
              key={file._id}
              onClick={() => handleFileSelect(file)}
              className="w-full flex items-center space-x-3 p-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{getFileIcon(file)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {getFileLanguage(file)} • {file.path}
                </div>
              </div>
            </button>
          ))}
          {recentFiles.length > 5 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              +{recentFiles.length - 5} more files
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ✅ Workspace Stats Component
  const WorkspaceStats = () => {
    const totalFiles = fileSystemItems.filter(item => item.type === 'file').length;
    const totalFolders = fileSystemItems.filter(item => item.type === 'folder').length;
    const languageStats = fileSystemItems
      .filter(item => item.type === 'file')
      .reduce((acc, file) => {
        const lang = getFileLanguage(file);
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Workspace Stats</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
            <div className="text-sm text-blue-800">Files</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalFolders}</div>
            <div className="text-sm text-green-800">Folders</div>
          </div>
        </div>

        {Object.keys(languageStats).length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Languages:</div>
            <div className="space-y-1">
              {Object.entries(languageStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4)
                .map(([lang, count]) => (
                  <div key={lang} className="flex justify-between text-sm">
                    <span className="text-gray-600">{lang}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  // ✅ Connection Status Component
  const ConnectionStatus = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h4 className="font-medium text-gray-900 mb-4">Collaboration Status</h4>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected && hasJoinedWorkspace ? 'bg-green-500' : 
            isConnected ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-700">
            {isConnected && hasJoinedWorkspace ? 'Connected' :
             isConnected ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">👥</span>
          <span className="text-sm text-gray-700">
            {workspaceUserCount} user{workspaceUserCount !== 1 ? 's' : ''} online
          </span>
        </div>

        {globalActiveUsers.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Active Users:</div>
            <div className="space-y-1">
              {globalActiveUsers.slice(0, 3).map(activeUser => (
                <div key={activeUser.userId} className="text-xs text-gray-600">
                  {activeUser.userName}
                </div>
              ))}
              {globalActiveUsers.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{globalActiveUsers.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ✅ Handle view mode changes
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'editor-only' && !showEditor) {
      setShowWelcome(true);
    }
  };

  // ✅ If showing editor, render full editor view
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
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">File Explorer</h3>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleViewModeChange('split')}
                  className={`p-1 rounded text-xs ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Split View"
                >
                  ⚏
                </button>
                <button
                  onClick={() => handleViewModeChange('editor-only')}
                  className={`p-1 rounded text-xs ${viewMode === 'editor-only' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Editor Only"
                >
                  ⛶
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
        <div className="flex-1 flex flex-col">
          <CodeEditor
            fileItem={selectedFile}
            workspaceId={workspaceId}
            onClose={handleCloseEditor}
          />
        </div>
      </div>
    );
  }

  // ✅ Main view (welcome screen or explorer-only)
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
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">File Explorer</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewModeChange('split')}
                    className={`p-1 rounded text-xs ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Split View"
                  >
                    ⚏
                  </button>
                  <button
                    onClick={() => handleViewModeChange('explorer-only')}
                    className={`p-1 rounded text-xs ${viewMode === 'explorer-only' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Explorer Only"
                  >
                    📁
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <div className="text-gray-400 mb-2">🔍</div>
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
      <div className="flex-1 flex flex-col">
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
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 mb-8">
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
                      <p className="text-sm text-gray-600">Open any file to start coding with syntax highlighting and auto-save</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        3
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Execute & Share</h4>
                      <p className="text-sm text-gray-600">Run your code and share results with your team in real-time</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-1">
                  <QuickActions />
                </div>
                
                <div className="xl:col-span-1">
                  <RecentFiles />
                </div>
                
                <div className="xl:col-span-1 lg:col-span-2 xl:col-span-1">
                  <div className="grid grid-cols-1 gap-6">
                    <WorkspaceStats />
                    <ConnectionStatus />
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">🚀</div>
                    <h4 className="font-medium text-gray-900 mb-2">Real-time Execution</h4>
                    <p className="text-sm text-gray-600">
                      Run JavaScript, Python, Java, C++ and more. See results instantly with our integrated execution engine.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">👥</div>
                    <h4 className="font-medium text-gray-900 mb-2">Live Collaboration</h4>
                    <p className="text-sm text-gray-600">
                      Code together in real-time. See cursor positions, edits, and execution results from your teammates.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">💾</div>
                    <h4 className="font-medium text-gray-900 mb-2">Auto-save</h4>
                    <p className="text-sm text-gray-600">
                      Never lose your work. Changes are automatically saved as you type with conflict resolution.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="font-medium text-gray-900 mb-2">Syntax Highlighting</h4>
                    <p className="text-sm text-gray-600">
                      Beautiful syntax highlighting for 20+ programming languages with customizable themes.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">🔒</div>
                    <h4 className="font-medium text-gray-900 mb-2">Role-based Access</h4>
                    <p className="text-sm text-gray-600">
                      Control who can view, edit, and execute code with granular permission management.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">📁</div>
                    <h4 className="font-medium text-gray-900 mb-2">File Management</h4>
                    <p className="text-sm text-gray-600">
                      Organize code with folders, drag-and-drop files, and powerful search capabilities.
                    </p>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Save file</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Execute code</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tab indent</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Search files</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Ctrl+P</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Toggle console</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Ctrl+`</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New file</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Ctrl+N</kbd>
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