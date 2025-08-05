import React, { useState } from 'react';
import FileExplorer from './FileExplorer.jsx';
import CodeEditor from './CodeEditor.jsx';

const CodeEditorMain = ({ workspaceId, workspace }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleFileSelect = (file) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setShowEditor(true);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedFile(null);
  };

  if (showEditor && selectedFile) {
    return (
      <CodeEditor
        fileItem={selectedFile}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <div className="h-full flex">
      {/* File Explorer Sidebar */}
      <div className="w-1/3 border-r border-gray-200">
        <FileExplorer
          workspaceId={workspaceId}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Welcome/Instructions Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-6">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Code Editor</h3>
          <p className="text-gray-600 mb-6">
            Collaborative code editing with real-time execution
          </p>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-left max-w-md">
              <h4 className="font-medium text-gray-900 mb-2">Getting Started:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Create files and folders using the file explorer</li>
                <li>• Click on any file to open it in the editor</li>
                <li>• Write code and click "Run" to execute</li>
                <li>• View execution results in the console panel</li>
                <li>• Code is automatically saved as you type</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-left max-w-md">
              <h4 className="font-medium text-blue-900 mb-2">Supported Languages:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                <div>• JavaScript (.js)</div>
                <div>• Python (.py)</div>
                <div>• Java (.java)</div>
                <div>• C++ (.cpp)</div>
                <div>• C (.c)</div>
                <div>• HTML (.html)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorMain;