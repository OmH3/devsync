import React, { useState, useEffect, useRef } from 'react';
import { useDocumentStore } from '../store/documentStore.js';

const DocumentEditor = ({ document, workspaceId, onClose }) => {
  const [title, setTitle] = useState(document.title || '');
  const [content, setContent] = useState(document.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  
  const saveTimeoutRef = useRef(null);
  const { updateDocument, error, clearError } = useDocumentStore();

  useEffect(() => {
    updateCounts(content);
  }, [content]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updateCounts = (text) => {
    setCharCount(text.length);
    setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
  };

  const autoSave = async () => {
    if (title.trim() && (title !== document.title || content !== document.content)) {
      setIsSaving(true);
      try {
        const result = await updateDocument(document._id, {
          title: title.trim(),
          content: content
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
    
    saveTimeoutRef.current = setTimeout(autoSave, 2000); // Save after 2 seconds of inactivity
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    clearError();
    debouncedSave();
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    clearError();
    debouncedSave();
  };

  const handleManualSave = async () => {
    if (!title.trim()) {
      alert('Please enter a document title');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateDocument(document._id, {
        title: title.trim(),
        content: content
      });
      
      if (result.success) {
        setLastSaved(new Date());
        alert('Document saved successfully!');
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    return lastSaved.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

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
          <div>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Document title..."
              className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              style={{ width: `${Math.max(title.length, 20)}ch` }}
            />
            <div className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : `Last saved: ${formatLastSaved()}`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="mr-4">{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
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

      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your document..."
          className="w-full h-full resize-none border-none focus:outline-none focus:ring-0 text-gray-900 text-base leading-relaxed"
          style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span>Room ID: {document.roomId}</span>
          <span className="ml-4">Collaborators: {document.collaborators?.length || 0}</span>
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

export default DocumentEditor;