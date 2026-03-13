import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';
import EnhancedDrawingCanvas from './EnhancedDrawingCanvas.jsx';

const WhiteboardCanvas = ({ whiteboard }) => {
  const [userCount, setUserCount] = useState(1);
  
  const { 
    selectedTool,
    selectedColor,
    strokeWidth,
    setSelectedTool,
    setSelectedColor,
    setStrokeWidth,
    clearDrawingData,
    saveDrawingData,
    userRole,
    canEdit,
    fetchUserRoleInWhiteboard,
    error,
    clearError
  } = useWhiteboardStore();

  //Fetch user role when whiteboard loads
  useEffect(() => {
    if (whiteboard?._id) {
      fetchUserRoleInWhiteboard(whiteboard._id);
    }
  }, [whiteboard?._id, fetchUserRoleInWhiteboard]);

  const handleUserCountChange = (count) => {
    setUserCount(count);
  };

  const handleClearCanvas = async () => {
    if (!canEdit) {
      alert('You do not have permission to clear this whiteboard');
      return;
    }

    if (window.confirm('Are you sure you want to clear the entire canvas?')) {
      const success = clearDrawingData();
      if (success && whiteboard?._id) {
        await saveDrawingData(whiteboard._id, []);
      }
    }
  };

  //Handle tool selection with permission check
  const handleToolSelect = (tool) => {
    if (!canEdit) {
      alert('You do not have permission to edit this whiteboard');
      return;
    }
    setSelectedTool(tool);
  };

  const handleColorSelect = (color) => {
    if (!canEdit) {
      alert('You do not have permission to edit this whiteboard');
      return;
    }
    setSelectedColor(color);
  };

  const handleStrokeWidthChange = (width) => {
    if (!canEdit) {
      alert('You do not have permission to edit this whiteboard');
      return;
    }
    setStrokeWidth(width);
  };

  const tools = [
    { id: 'pen', name: 'Pen', icon: '' },
    { id: 'eraser', name: 'Eraser', icon: '' },
    { id: 'rectangle', name: 'Rectangle', icon: '' },
    { id: 'circle', name: 'Circle', icon: '' },
    { id: 'text', name: 'Text', icon: '' },
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {whiteboard?.boardTitle || 'Whiteboard'}
          </h3>
          {whiteboard?.boardDescription && (
            <p className="text-sm text-gray-600">{whiteboard.boardDescription}</p>
          )}
          {/*  Show role and permission status */}
          <div className="flex items-center space-x-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              canEdit 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {canEdit ? ' Can Edit' : ' View Only'}
            </span>
            {userRole && (
              <span className={`text-xs px-2 py-1 rounded ${
                userRole === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                userRole === 'ADMIN' ? 'bg-red-100 text-red-800' :
                userRole === 'MEMBER' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Role: {userRole}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Room: {whiteboard?.roomId}
          </div>
          <div className="text-sm font-medium text-indigo-600">
            {userCount} active user{userCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/*  Show error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              
            </button>
          </div>
        </div>
      )}

      {/*  Show read-only banner for members */}
      {userRole === 'MEMBER' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-lg"></span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Read-Only Mode:</strong> You can view this whiteboard but cannot make changes. 
                Only workspace owners and admins can edit whiteboards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Show for all users but disable tools for members */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {/* Tools */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Tools:</span>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              disabled={!canEdit}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                selectedTool === tool.id
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                  : canEdit 
                    ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title={canEdit ? tool.name : `${tool.name} (Read-only)`}
            >
              <span className="text-lg mr-1">{tool.icon}</span>
              {tool.name}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Colors:</span>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              disabled={!canEdit}
              className={`w-8 h-8 rounded border-2 ${
                selectedColor === color ? 'border-gray-600' : 'border-gray-300'
              } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
              style={{ backgroundColor: color }}
              title={canEdit ? color : `${color} (Read-only)`}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Width:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
            disabled={!canEdit}
            className={`w-20 ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          <span className="text-sm text-gray-700 w-8">{strokeWidth}px</span>
        </div>

        {/* Clear Button */}
        <button
          onClick={handleClearCanvas}
          disabled={!canEdit}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            canEdit 
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={canEdit ? 'Clear Canvas' : 'Clear Canvas (Read-only)'}
        >
          Clear Canvas
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <EnhancedDrawingCanvas 
          whiteboard={whiteboard}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          strokeWidth={strokeWidth}
          onUserCountChange={handleUserCountChange}
          canEdit={canEdit}
          userRole={userRole}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          Tool: {selectedTool} | Color: {selectedColor} | Width: {strokeWidth}px
          {userRole === 'MEMBER' && <span className="text-red-600 ml-2">(Read-only)</span>}
        </div>
        <div className="text-sm text-gray-600">
          Collaborators: {whiteboard?.collaborators?.length || 0}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;