import React, { useState, useEffect, useRef } from 'react';
import { useCodeEditorStore } from '../store/codeeditorStore.js';

const CodeEditor = ({ fileItem, onClose }) => {
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  
  const { 
    currentEditor,
    executions,
    isExecuting,
    fetchCodeEditorByFileId, 
    updateCodeEditor,
    executeCode,
    fetchExecutionHistory,
    error, 
    clearError 
  } = useCodeEditorStore();

  useEffect(() => {
    if (fileItem?._id) {
      fetchCodeEditorByFileId(fileItem._id);
    }
  }, [fileItem, fetchCodeEditorByFileId]);

  useEffect(() => {
    if (currentEditor) {
      setCode(currentEditor.content || '');
      fetchExecutionHistory(currentEditor._id);
    }
  }, [currentEditor, fetchExecutionHistory]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const autoSave = async () => {
    if (currentEditor && code !== currentEditor.content) {
      setIsSaving(true);
      try {
        const result = await updateCodeEditor(currentEditor._id, {
          content: code
        });
        
        if (result.success) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(autoSave, 2000);
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    clearError();
    debouncedSave();
  };

  const handleManualSave = async () => {
    if (!currentEditor) return;

    setIsSaving(true);
    try {
      const result = await updateCodeEditor(currentEditor._id, {
        content: code
      });
      
      if (result.success) {
        setLastSaved(new Date());
        alert('Code saved successfully!');
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteCode = async () => {
    if (!currentEditor || !code.trim()) {
      alert('Please write some code before executing');
      return;
    }

    const executionData = {
      input: input.trim()
    };

    const result = await executeCode(currentEditor._id, executionData);
    
    if (result.success) {
      setShowExecutionPanel(true);
      setInput(''); // Clear input after execution
    }
  };

  const getLanguageFromExtension = (extension) => {
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json'
    };
    return langMap[extension?.toLowerCase()] || 'text';
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    return lastSaved.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatExecutionTime = (ms) => {
    return `${ms}ms`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  if (!currentEditor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading code editor...</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromExtension(fileItem?.metadata?.extension);

  return (
    <div className="h-full flex flex-col bg-white">
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{currentEditor.title}</h3>
            <div className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : `Last saved: ${formatLastSaved()}`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="mr-4">Language: {language}</span>
            <span>Lines: {code.split('\n').length}</span>
          </div>
          
          <button
            onClick={() => setShowExecutionPanel(!showExecutionPanel)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              showExecutionPanel 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Console
          </button>
          
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleExecuteCode}
            disabled={isExecuting || !code.trim()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isExecuting ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
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

      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Input Panel (for code that requires input) */}
          {['python', 'java', 'cpp', 'c'].includes(language) && (
            <div className="border-b border-gray-200 p-3 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program Input (optional):
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input for your program..."
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {/* Code Textarea */}
          <div className="flex-1 p-4">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your code here..."
              className="w-full h-full resize-none border-none focus:outline-none focus:ring-0 text-sm font-mono leading-relaxed"
              style={{ 
                fontFamily: 'Monaco, "Lucida Console", monospace',
                tabSize: 2
              }}
            />
          </div>
        </div>

        {/* Execution Panel */}
        {showExecutionPanel && (
          <div className="w-1/3 border-l border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-900">Execution Results</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {executions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No executions yet</p>
                  <p className="text-xs">Run your code to see results</p>
                </div>
              ) : (
                executions.map((execution) => (
                  <div key={execution._id} className="border border-gray-200 rounded-md p-3">
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
                      <span className="text-xs text-gray-500">
                        {formatExecutionTime(execution.executionTime)}
                      </span>
                    </div>
                    
                    {execution.input && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-gray-600">Input:</label>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1">{execution.input}</pre>
                      </div>
                    )}
                    
                    {execution.output && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-gray-600">Output:</label>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap">{execution.output}</pre>
                      </div>
                    )}
                    
                    {execution.error && (
                      <div className="mb-2">
                        <label className="text-xs font-medium text-red-600">Error:</label>
                        <pre className="text-xs bg-red-50 p-2 rounded mt-1 text-red-700 whitespace-pre-wrap">{execution.error}</pre>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(execution.createdAt).toLocaleString()}
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
        <div className="text-sm text-gray-600">
          <span>Room ID: {currentEditor.roomId}</span>
          <span className="ml-4">Collaborators: {currentEditor.collaborators?.length || 0}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSaving ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;