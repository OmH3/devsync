import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { useCodeEditorStore } from '../store/codeeditorStore.js';
import { useAuth } from '../hooks/useAuth.js';

const CodeEditor = ({ fileItem, workspaceId, onClose }) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [fontSize, setFontSize] = useState(14);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  
  // ✅ Real-time collaboration states
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [hasJoinedEditor, setHasJoinedEditor] = useState(false);
  const [error, setError] = useState('');
  const [editorPermissions, setEditorPermissions] = useState(null);
  const [cursors, setCursors] = useState({}); // Other users' cursors
  const [selections, setSelections] = useState({}); // Other users' selections

  // ✅ Refs for managing state
  const saveTimeoutRef = useRef(null);
  const isUpdatingFromSocketRef = useRef(false);
  const lastSavedContentRef = useRef({ title: '', code: '', language: '' });
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const lastBroadcastRef = useRef({ title: '', code: '', language: '' });
  const pendingSaveRef = useRef(false);
  const isJoiningRef = useRef(false);
  const cursorPositionRef = useRef({ line: 0, column: 0 });

  // ✅ Hooks
  const { user } = useAuth();
  const socket = useSocket();
  
  const { 
    currentEditor,
    editorContent,
    editorTitle,
    executions,
    isExecuting,
    fetchCodeEditorByFileId,
    fetchUserRoleInCodeEditor,
    saveCodeEditorContent,
    updateCodeEditor,
    executeCode,
    fetchExecutionHistory,
    updateEditorFromSocket,
    addExecutionFromSocket,
    handleUserJoined,
    handleUserLeft,
    updateCursor,
    removeCursor,
    clearEditor,
    setCurrentEditor,
    permissions
  } = useCodeEditorStore();

  // ✅ Reset editor state when fileItem changes
  useEffect(() => {
    console.log('💻 CodeEditor mounted/file changed, resetting state');
    
    // Reset all editor-specific state
    setHasJoinedEditor(false);
    setActiveUsers([]);
    setUserCount(1);
    setError('');
    setHasUnsavedChanges(false);
    setLastSaved(null);
    setCursors({});
    setSelections({});
    setShowExecutionPanel(false);
    
    // Reset refs
    isJoiningRef.current = false;
    lastBroadcastRef.current = { title: '', code: '', language: '' };
    lastSavedContentRef.current = { title: '', code: '', language: '' };
    
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Update connection status
    setIsConnected(socket?.connected || false);
    
  }, [fileItem._id, socket]);

  // ✅ Fetch code editor and permissions on mount
  useEffect(() => {
    const initializeEditor = async () => {
      if (!fileItem?._id) return;

      console.log('💻 Initializing code editor for file:', fileItem._id);
      
      try {
        // Fetch code editor
        const editorResult = await fetchCodeEditorByFileId(fileItem._id);
        
        if (editorResult.success && editorResult.editor) {
          const editor = editorResult.editor;
          setCode(editor.content || '');
          setTitle(editor.title || fileItem.name);
          setLanguage(editor.language || getLanguageFromExtension(fileItem.metadata?.extension));
          
          // Fetch permissions
          const permResult = await fetchUserRoleInCodeEditor(editor._id);
          if (permResult.success) {
            setEditorPermissions(permResult.permissions);
            console.log('✅ Code editor permissions loaded:', permResult.permissions);
          }
          
          // Fetch execution history
          fetchExecutionHistory(editor._id);
        }
      } catch (error) {
        console.error('❌ Error initializing code editor:', error);
        setError('Failed to load code editor');
      }
    };

    initializeEditor();
  }, [fileItem, fetchCodeEditorByFileId, fetchUserRoleInCodeEditor, fetchExecutionHistory]);

  // ✅ Update local state when store changes
  useEffect(() => {
    if (currentEditor && !isUpdatingFromSocketRef.current) {
      setCode(currentEditor.content || '');
      setTitle(currentEditor.title || '');
      setLanguage(currentEditor.language || 'javascript');
    }
  }, [currentEditor]);

  // ✅ Update line count and scroll sync
  useEffect(() => {
    updateLineNumbers();
  }, [code, lineNumbers]);

  // ✅ Get language from file extension
  const getLanguageFromExtension = useCallback((extension) => {
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript', 
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift'
    };
    return langMap[extension?.toLowerCase()] || 'text';
  }, []);

  // ✅ Update line numbers display
  const updateLineNumbers = useCallback(() => {
    if (!lineNumbers || !lineNumbersRef.current || !textareaRef.current) return;

    const lines = code.split('\n').length;
    const lineNumbersContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    lineNumbersRef.current.textContent = lineNumbersContent;

    // Sync scroll
    lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
  }, [code, lineNumbers]);

  // ✅ Join code editor room
  const joinCodeEditor = useCallback(() => {
    if (isJoiningRef.current) {
      console.log('⏳ Already attempting to join code editor');
      return;
    }

    if (!socket || !socket.connected) {
      console.log('❌ Cannot join code editor: No socket or not connected');
      return;
    }

    if (hasJoinedEditor) {
      console.log('✅ Already joined code editor:', currentEditor?._id);
      return;
    }

    if (!currentEditor?._id || !user._id) {
      console.log('❌ Cannot join code editor: Missing editor ID or user ID');
      return;
    }

    console.log('💻 Emitting join-code-editor event for:', currentEditor._id);
    isJoiningRef.current = true;
    socket.emit('join-code-editor', currentEditor._id);
    
    setTimeout(() => {
      isJoiningRef.current = false;
    }, 5000);
  }, [socket, currentEditor?._id, hasJoinedEditor, user._id]);

  // ✅ Leave code editor room
  const leaveCodeEditor = useCallback(() => {
    if (!socket || !hasJoinedEditor || !currentEditor?._id) return;
    
    console.log('🚪 Leaving code editor:', currentEditor._id);
    socket.emit('leave-code-editor', currentEditor._id);
    setHasJoinedEditor(false);
    setActiveUsers([]);
    setUserCount(1);
    setCursors({});
    setSelections({});
    isJoiningRef.current = false;
  }, [socket, currentEditor?._id, hasJoinedEditor]);

  // ✅ FIXED: Setup socket listeners (matching DocumentEditor pattern)
  const setupSocketListeners = useCallback(() => {
    if (!socket) return;

    console.log('💻 Setting up code editor socket listeners');

    const handleCodeEditorJoined = (data) => {
      console.log('✅ Successfully joined code editor:', data);
      setHasJoinedEditor(true);
      setUserCount(data.userCount || 1);
      setError('');
      isJoiningRef.current = false;
    };

    // ✅ Handle real-time content changes from socket (matching docs pattern)
    const handleCodeEditorChanged = (data) => {
      console.log('💻 Received live code editor change:', data);
      
      // ✅ Ignore own changes
      if (data.userId === user._id) {
        console.log('🔄 Ignoring own change');
        return;
      }
      
      console.log('🔄 Applying live change from other user');
      isUpdatingFromSocketRef.current = true;
      
      // ✅ Always apply changes from other users (like docs)
      if (data.title !== undefined) {
        setTitle(data.title);
      }
      
      if (data.content !== undefined) {
        setCode(data.content);
      }

      if (data.language !== undefined) {
        setLanguage(data.language);
      }
      
      // ✅ Update store
      updateEditorFromSocket(currentEditor?._id, {
        title: data.title,
        content: data.content,
        language: data.language
      });
      
      setTimeout(() => {
        isUpdatingFromSocketRef.current = false;
      }, 100);
    };

    const handleCodeEditorContentSaved = (data) => {
      console.log('💾 Code editor content saved by another user:', data);
      if (data.savedBy.userId !== user._id) {
        setLastSaved(new Date(data.timestamp));
        if (!hasUnsavedChanges) {
          lastSavedContentRef.current = {
            title: data.content.title || title,
            code: data.content.content || code,
            language: data.content.language || language
          };
        }
      }
    };

    const handleCodeEditorExecutionResult = (data) => {
      console.log('🚀 Code execution result from another user:', data);
      if (data.executedBy.userId !== user._id) {
        // ✅ Add execution result to store
        addExecutionFromSocket({
          _id: `${data.codeEditorId}-${data.timestamp}`,
          result: data.result,
          error: data.error,
          executionTime: data.executionTime,
          language: data.language,
          status: data.error ? 'error' : 'completed',
          output: data.result,
          input: data.input || '',
          executedBy: data.executedBy,
          createdAt: data.timestamp
        });
        setLastSaved(new Date(data.timestamp));
      }
    };

    const handleCodeEditorCursorMove = (data) => {
      console.log('👆 User cursor moved:', data);
      if (data.user.userId !== user._id) {
        setCursors(prev => ({
          ...prev,
          [data.user.userId]: {
            position: data.position,
            selection: data.selection,
            user: data.user,
            timestamp: Date.now()
          }
        }));
        updateCursor(data.user.userId, data.position, data.selection);
      }
    };

    const handleUserJoinedCodeEditor = (data) => {
      console.log('👤 User joined code editor:', data);
      setActiveUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
      handleUserJoined(data);
    };

    const handleUserLeftCodeEditor = (data) => {
      console.log('👋 User left code editor:', data);
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      setCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[data.userId];
        return newCursors;
      });
      handleUserLeft(data);
      removeCursor(data.userId);
    };

    const handleUserCount = (count) => {
      console.log('👥 Code editor user count:', count);
      setUserCount(count);
    };

    const handleSocketError = (error) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'Socket error occurred');
      isJoiningRef.current = false;
    };

    // ✅ Attach listeners (FIXED event names)
    socket.on('code-editor-joined', handleCodeEditorJoined);
    socket.on('code-editor-changed', handleCodeEditorChanged); // ✅ FIXED: matches backend event
    socket.on('code-editor-content-saved', handleCodeEditorContentSaved);
    socket.on('code-editor-execution-result', handleCodeEditorExecutionResult);
    socket.on('code-editor-cursor-move', handleCodeEditorCursorMove);
    socket.on('user-joined-code-editor', handleUserJoinedCodeEditor);
    socket.on('user-left-code-editor', handleUserLeftCodeEditor);
    socket.on('user-count', handleUserCount);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('code-editor-joined', handleCodeEditorJoined);
      socket.off('code-editor-changed', handleCodeEditorChanged);
      socket.off('code-editor-content-saved', handleCodeEditorContentSaved);
      socket.off('code-editor-execution-result', handleCodeEditorExecutionResult);
      socket.off('code-editor-cursor-move', handleCodeEditorCursorMove);
      socket.off('user-joined-code-editor', handleUserJoinedCodeEditor);
      socket.off('user-left-code-editor', handleUserLeftCodeEditor);
      socket.off('user-count', handleUserCount);
      socket.off('error', handleSocketError);
    };
  }, [
    socket, 
    user._id, 
    title, 
    code, 
    language, 
    hasUnsavedChanges, 
    updateEditorFromSocket, 
    addExecutionFromSocket, 
    handleUserJoined, 
    handleUserLeft, 
    updateCursor, 
    removeCursor,
    currentEditor?._id
  ]);

  // ✅ Socket connection and events setup
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      setHasJoinedEditor(false);
      return;
    }

    const handleConnect = () => {
      console.log('✅ Socket connected for code editor');
      setIsConnected(true);
      
      if (!hasJoinedEditor && !isJoiningRef.current && currentEditor?._id) {
        setTimeout(() => joinCodeEditor(), 200);
      }
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected from code editor');
      setIsConnected(false);
      setHasJoinedEditor(false);
      setActiveUsers([]);
      setUserCount(1);
      setCursors({});
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
  }, [socket, hasJoinedEditor, joinCodeEditor, currentEditor?._id]);

  // ✅ Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    const cleanup = setupSocketListeners();
    
    if (socket.connected && !hasJoinedEditor && !isJoiningRef.current && currentEditor?._id) {
      setTimeout(() => joinCodeEditor(), 100);
    }

    return () => {
      if (cleanup) cleanup();
      leaveCodeEditor();
    };
  }, [socket, setupSocketListeners, joinCodeEditor, leaveCodeEditor, hasJoinedEditor, currentEditor?._id]);

  // ✅ Smart broadcast changes
  const broadcastChange = useCallback((newTitle, newCode, newLanguage) => {
    if (!socket || !socket.connected || !hasJoinedEditor || isUpdatingFromSocketRef.current) {
      return;
    }

    // ✅ Don't broadcast if no actual changes
    if (
      newTitle === lastBroadcastRef.current.title && 
      newCode === lastBroadcastRef.current.code &&
      newLanguage === lastBroadcastRef.current.language
    ) {
      return;
    }

    console.log('📡 Broadcasting code editor change');
    socket.emit('code-editor-change', {
      codeEditorId: currentEditor._id,
      title: newTitle,
      content: newCode,
      language: newLanguage,
      timestamp: Date.now()
    });

    lastBroadcastRef.current = {
      title: newTitle,
      code: newCode,
      language: newLanguage
    };
  }, [socket, currentEditor?._id, hasJoinedEditor]);

  // ✅ Broadcast cursor position
  const broadcastCursor = useCallback((position, selection) => {
    if (!socket || !socket.connected || !hasJoinedEditor || !currentEditor?._id) {
      return;
    }

    socket.emit('code-editor-cursor', {
      codeEditorId: currentEditor._id,
      position: position,
      selection: selection,
      user: {
        userId: user._id,
        userName: user.name,
        userColor: user.profileColor || '#3B82F6'
      }
    });
  }, [socket, currentEditor?._id, hasJoinedEditor, user]);

  // ✅ Auto-save functionality
  const autoSave = useCallback(async () => {
    // ✅ Permission check ONLY for saving, not for receiving updates (like docs)
    if (!editorPermissions?.canEdit) {
      console.log('❌ Auto-save skipped: No edit permission');
      return;
    }

    if (pendingSaveRef.current) {
      console.log('⏳ Save already in progress, skipping');
      return;
    }

    const currentTitle = title.trim();
    const currentCode = code;
    const currentLanguage = language;
    
    // ✅ Check if there are actual changes to save
    if (
      currentTitle === lastSavedContentRef.current.title && 
      currentCode === lastSavedContentRef.current.code &&
      currentLanguage === lastSavedContentRef.current.language
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
      console.log('💾 Auto-saving code editor...');
      const result = await saveCodeEditorContent(currentEditor._id, currentTitle, currentCode);
      
      if (result.success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setError('');
        
        // ✅ Update saved content reference
        lastSavedContentRef.current = {
          title: currentTitle,
          code: currentCode,
          language: currentLanguage
        };

        // ✅ Notify other users about auto-save (like docs)
        if (socket && socket.connected && hasJoinedEditor) {
          socket.emit('code-editor-auto-save', {
            codeEditorId: currentEditor._id,
            title: currentTitle,
            content: currentCode,
            language: currentLanguage
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
  }, [title, code, language, editorPermissions?.canEdit, saveCodeEditorContent, currentEditor?._id, socket, hasJoinedEditor]);

  // ✅ Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (editorPermissions?.canEdit) {
      saveTimeoutRef.current = setTimeout(autoSave, 1500);
    }
  }, [autoSave, editorPermissions?.canEdit]);

  // ✅ FIXED: Handle code changes (matching docs pattern)
  const handleCodeChange = useCallback((e) => {
    const newCode = e.target.value;
    
    // ✅ Always allow local state update for real-time display (like docs)
    setCode(newCode);
    
    // ✅ Don't broadcast or save if updating from socket
    if (isUpdatingFromSocketRef.current) {
      console.log('🔄 Skipping broadcast - updating from socket');
      return;
    }
    
    // ✅ Check edit permission for broadcasting and saving
    if (!editorPermissions?.canEdit) {
      console.log('👁️ Read-only user viewing code change');
      return;
    }

    setHasUnsavedChanges(true);
    setError('');
    
    // ✅ Broadcast change to other users (only if user can edit)
    broadcastChange(title, newCode, language);
    debouncedSave();

    // ✅ Update and broadcast cursor position
    const textarea = e.target;
    const position = {
      line: newCode.substring(0, textarea.selectionStart).split('\n').length - 1,
      column: textarea.selectionStart - newCode.lastIndexOf('\n', textarea.selectionStart - 1) - 1
    };
    
    const selection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };

    cursorPositionRef.current = position;
    broadcastCursor(position, selection);
  }, [
    editorPermissions?.canEdit, 
    title, 
    language, 
    broadcastChange, 
    debouncedSave, 
    broadcastCursor
  ]);

  // ✅ FIXED: Handle title changes (matching docs pattern)
  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    
    // ✅ Always allow local state update (like docs)
    setTitle(newTitle);
    
    // ✅ Don't broadcast if updating from socket
    if (isUpdatingFromSocketRef.current) {
      console.log('🔄 Skipping title broadcast - updating from socket');
      return;
    }
    
    // ✅ Check edit permission for broadcasting and saving
    if (!editorPermissions?.canEdit) {
      console.log('👁️ Read-only user viewing title change');
      return;
    }

    setHasUnsavedChanges(true);
    setError('');
    
    broadcastChange(newTitle, code, language);
    debouncedSave();
  }, [
    editorPermissions?.canEdit, 
    code, 
    language, 
    broadcastChange, 
    debouncedSave
  ]);

  // ✅ Handle language changes
  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    
    if (isUpdatingFromSocketRef.current) {
      return;
    }
    
    if (!editorPermissions?.canEdit) {
      setError('You do not have permission to change the language');
      return;
    }

    setHasUnsavedChanges(true);
    setError('');
    
    broadcastChange(title, code, newLanguage);
    debouncedSave();
  }, [editorPermissions?.canEdit, title, code, broadcastChange, debouncedSave]);

  // ✅ Manual save
  const handleManualSave = useCallback(async () => {
    if (!editorPermissions?.canEdit) {
      setError('You do not have permission to edit this code editor');
      return;
    }

    if (!title.trim()) {
      setError('Code editor title is required');
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
      console.log('💾 Manual save initiated');
      const result = await saveCodeEditorContent(currentEditor._id, title.trim(), code);
      
      if (result.success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        lastSavedContentRef.current = {
          title: title.trim(),
          code: code,
          language: language
        };

        if (socket && socket.connected && hasJoinedEditor) {
          socket.emit('code-editor-save', {
            codeEditorId: currentEditor._id,
            title: title.trim(),
            content: code,
            language: language
          });
        }

        console.log('✅ Manual save successful');
      } else {
        setError(result.error || 'Save failed');
        console.error('❌ Manual save failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Manual save error:', error);
      setError('Failed to save code editor');
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  }, [editorPermissions?.canEdit, title, code, language, hasUnsavedChanges, saveCodeEditorContent, currentEditor?._id, socket, hasJoinedEditor]);

  // ✅ Execute code
  // In your CodeEditor.jsx - verify this logic
const handleExecuteCode = useCallback(async () => {
  if (!currentEditor || !code.trim()) {
    setError('Please write some code before executing');
    return;
  }

  // ✅ FIXED: Check execute permission
  if (!editorPermissions?.canExecute) {
    setError('You do not have permission to execute code in this workspace');
    console.log('❌ Execute permission denied:', editorPermissions);
    return;
  }

  console.log('✅ Execute permission granted:', editorPermissions);

  const executionData = {
    input: input.trim(),
    code: code.trim(),
    language: language
  };

  console.log('🚀 Executing code:', executionData);

  const result = await executeCode(currentEditor._id, executionData);
  
  if (result.success) {
    setShowExecutionPanel(true);
    setInput('');
    
    // Broadcast execution to other users
    if (socket && socket.connected && hasJoinedEditor) {
      socket.emit('code-editor-execution', {
        codeEditorId: currentEditor._id,
        result: result.execution.output || result.execution.result,
        error: result.execution.error,
        executionTime: result.execution.executionTime,
        language: language,
        input: input.trim()
      });
    }
  } else {
    console.error('❌ Execute failed:', result.error);
    setError(result.error || 'Code execution failed');
  }
}, [currentEditor, code, language, input, editorPermissions?.canExecute, executeCode, socket, hasJoinedEditor]);

  // ✅ Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      
      setCode(newCode);
      
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
      
      if (editorPermissions?.canEdit && !isUpdatingFromSocketRef.current) {
        setHasUnsavedChanges(true);
        broadcastChange(title, newCode, language);
        debouncedSave();
      }
    }
    
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleManualSave();
    }
    
    // Ctrl+Enter for execute
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteCode();
    }
  }, [code, title, language, editorPermissions?.canEdit, broadcastChange, debouncedSave, handleManualSave, handleExecuteCode]);

  // ✅ Handle cursor position changes
  const handleCursorMove = useCallback((e) => {
    if (!editorPermissions?.canEdit || isUpdatingFromSocketRef.current) return;
    
    const textarea = e.target;
    const position = {
      line: code.substring(0, textarea.selectionStart).split('\n').length - 1,
      column: textarea.selectionStart - code.lastIndexOf('\n', textarea.selectionStart - 1) - 1
    };
    
    const selection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };

    cursorPositionRef.current = position;
    broadcastCursor(position, selection);
  }, [code, broadcastCursor, editorPermissions?.canEdit]);

  // ✅ Handle scroll sync for line numbers
  const handleScroll = useCallback((e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 CodeEditor unmounting, cleaning up');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      leaveCodeEditor();
    };
  }, [leaveCodeEditor]);

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
    if (!hasJoinedEditor) return { status: 'Joining Editor...', color: 'bg-yellow-500', icon: '🔄' };
    return { status: 'Connected', color: 'bg-green-500', icon: '✅' };
  };

  const getLanguageIcon = (lang) => {
    const icons = {
      'javascript': '🟨', 'typescript': '🔷', 'python': '🐍', 'java': '☕',
      'cpp': '⚙️', 'c': '⚙️', 'html': '🌐', 'css': '🎨', 'scss': '🎨',
      'json': '📋', 'markdown': '📝', 'php': '🐘', 'ruby': '💎',
      'go': '🐹', 'rust': '🦀', 'kotlin': '🅺', 'swift': '🐦'
    };
    return icons[lang] || '📄';
  };

  const connectionStatus = getConnectionStatus();

  if (!currentEditor) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading code editor...</p>
          <p className="text-gray-500 text-sm mt-2">Preparing collaborative environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Code editor title..."
              readOnly={!editorPermissions?.canEdit}
              className={`text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${
                !editorPermissions?.canEdit ? 'cursor-default opacity-80' : ''
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

              {editorPermissions?.canEdit === false && (
                <span className="text-yellow-600 text-xs font-medium flex items-center">
                  <span className="mr-1">👁️</span>
                  Read Only
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Language selector */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getLanguageIcon(language)}</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={!editorPermissions?.canEdit}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            <span className="mr-3">Lines: {code.split('\n').length}</span>
            <span>Chars: {code.length}</span>
          </div>
          
          {hasUnsavedChanges && editorPermissions?.canEdit && (
            <div className="flex items-center text-xs text-orange-600 font-medium">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
              Unsaved changes
            </div>
          )}

          <button
            onClick={() => setShowCollaborators(!showCollaborators)}
            className={`p-2 rounded-md text-sm font-medium ${
              showCollaborators ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={`${activeUsers.length} active users`}
          >
            👥 {activeUsers.length}
          </button>
          
          <button
            onClick={() => setShowExecutionPanel(!showExecutionPanel)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              showExecutionPanel 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Console {executions.length > 0 && `(${executions.length})`}
          </button>
          
          {editorPermissions?.canEdit && (
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
          
          {editorPermissions?.canExecute && (
            <button
              onClick={handleExecuteCode}
              disabled={isExecuting || !code.trim()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </span>
              ) : (
                'Run ▶'
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

      {/* Active Users Display */}
      {activeUsers.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-blue-700 font-medium">Currently coding:</span>
            {activeUsers.slice(0, 5).map((activeUser, index) => (
              <span key={activeUser.userId} className="text-blue-600">
                {activeUser.userName}
                {index < Math.min(activeUsers.length, 5) - 1 && ', '}
              </span>
            ))}
            {activeUsers.length > 5 && (
              <span className="text-blue-600">+{activeUsers.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Read-only banner */}
      {editorPermissions?.canEdit === false && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg">👁️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>View-Only Mode:</strong> You can see real-time changes but cannot edit this code. 
                Contact the file owner or workspace admin for edit access.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Input Panel */}
          {['python', 'java', 'cpp', 'c'].includes(language) && (
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program Input (optional):
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input for your program..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {/* Code Editor Area */}
          <div className="flex-1 flex relative">
            {/* Line Numbers */}
            {lineNumbers && (
              <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col">
                <div 
                  ref={lineNumbersRef}
                  className="flex-1 p-2 pr-1 text-xs text-gray-500 font-mono leading-relaxed text-right overflow-hidden whitespace-pre select-none"
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
                />
              </div>
            )}

            {/* Code Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                onSelect={handleCursorMove}
                onClick={handleCursorMove}
                onScroll={handleScroll}
                placeholder={
                  editorPermissions?.canEdit 
                    ? "Write your code here..." 
                    : "This code editor is read-only - you can see real-time changes from other users"
                }
                readOnly={!editorPermissions?.canEdit}
                className={`w-full h-full resize-none border-none focus:outline-none focus:ring-0 p-4 font-mono leading-relaxed transition-colors ${
                  !editorPermissions?.canEdit 
                    ? 'cursor-default bg-gray-50 opacity-90' 
                    : 'bg-white'
                }`}
                style={{ 
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.5',
                  tabSize: 2
                }}
                spellCheck={false}
              />

              {/* Other users' cursors */}
              {Object.entries(cursors).map(([userId, cursor]) => (
                <div
                  key={userId}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${cursor.position.column * 0.6}em`,
                    top: `${cursor.position.line * 1.5}em`,
                    borderLeft: `2px solid ${cursor.user.userColor}`,
                    height: '1.5em',
                    zIndex: 10
                  }}
                >
                  <div 
                    className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                    style={{ backgroundColor: cursor.user.userColor }}
                  >
                    {cursor.user.userName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Collaborators Panel */}
        {showCollaborators && (
          <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-900">Active Collaborators</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {activeUsers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No other collaborators</p>
                  <p className="text-xs">Share this workspace to collaborate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeUsers.map((collaborator) => (
                    <div key={collaborator.userId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: collaborator.userColor || '#3B82F6' }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {collaborator.userName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cursors[collaborator.userId] 
                            ? `Line ${cursors[collaborator.userId].position.line + 1}`
                            : 'Viewing'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Panel */}
        {showExecutionPanel && (
          <div className="w-1/3 border-l border-gray-200 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Console Output</h4>
                <button
                  onClick={() => setShowExecutionPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {executions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p>No executions yet</p>
                  <p className="text-xs mt-1">Run your code to see results</p>
                </div>
              ) : (
                executions.map((execution, index) => (
                  <div key={execution._id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        execution.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : execution.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {execution.status}
                      </span>
                      <div className="text-xs text-gray-500">
                        <span>#{executions.length - index}</span>
                        <span className="ml-2">{execution.executionTime}ms</span>
                      </div>
                    </div>
                    
                    {execution.input && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-gray-600">Input:</label>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono">{execution.input}</pre>
                      </div>
                    )}
                    
                    {execution.output && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-gray-600">Output:</label>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap font-mono">{execution.output}</pre>
                      </div>
                    )}
                    
                    {execution.error && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-red-600">Error:</label>
                        <pre className="text-xs bg-red-50 p-2 rounded mt-1 text-red-700 whitespace-pre-wrap font-mono">{execution.error}</pre>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                      <span>{new Date(execution.createdAt).toLocaleString()}</span>
                      {execution.executedBy && execution.executedBy.userId !== user._id && (
                        <span className="text-blue-600">by {execution.executedBy.userName}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Room: {currentEditor._id?.slice(-8)}</span>
          <span>Language: {language}</span>
          <span>Lines: {code.split('\n').length}</span>
          {editorPermissions?.canEdit === false && (
            <span className="text-yellow-600">👁️ View-only</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSaving ? 'bg-blue-100 text-blue-800' : 
            hasUnsavedChanges && editorPermissions?.canEdit ? 'bg-orange-100 text-orange-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                Saving...
              </>
            ) : hasUnsavedChanges && editorPermissions?.canEdit ? (
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

      {/* Debug Info (remove in production) */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-30">
        Socket: {socket ? '✅' : '❌'} | 
        Connected: {isConnected ? '✅' : '❌'} | 
        Joining: {isJoiningRef.current ? '⏳' : '✅'} |
        Joined: {hasJoinedEditor ? '✅' : '❌'} |
        Edit: {editorPermissions?.canEdit ? '✅' : '❌'} |
        Execute: {editorPermissions?.canExecute ? '✅' : '❌'} |
        Saving: {isSaving ? '⏳' : '✅'}
      </div>
    </div>
  );
};

export default CodeEditor;