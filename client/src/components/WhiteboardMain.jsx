import React, { useState, useCallback, useMemo } from 'react';
import WhiteboardList from './WhiteboardList.jsx';
import WhiteboardCanvas from './WhiteboardCanvas.jsx';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const WhiteboardMain = React.memo(({ workspaceId, workspace }) => {
  const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  
  const { 
    setCurrentWhiteboard,
    setSelectedTool,
    setSelectedColor,
    setStrokeWidth,
    selectedTool,
    selectedColor,
    strokeWidth,
    userRole,
    canEdit
  } = useWhiteboardStore();

  const handleWhiteboardSelect = useCallback((whiteboard) => {
    setSelectedWhiteboard(whiteboard);
    setCurrentWhiteboard(whiteboard);
    setShowCanvas(true);
  }, [setCurrentWhiteboard]);

  const handleBackToList = useCallback(() => {
    setShowCanvas(false);
    setSelectedWhiteboard(null);
    setCurrentWhiteboard(null);
  }, [setCurrentWhiteboard]);

  //Handle tool changes with permission checks
  const handleToolChange = (tool) => {
    if (userRole === 'MEMBER') {
      alert('Members cannot edit whiteboards');
      return;
    }
    setSelectedTool(tool);
  };

  const handleColorChange = (color) => {
    if (userRole === 'MEMBER') {
      alert('Members cannot edit whiteboards');
      return;
    }
    setSelectedColor(color);
  };

  const handleStrokeWidthChange = (width) => {
    if (userRole === 'MEMBER') {
      alert('Members cannot edit whiteboards');
      return;
    }
    setStrokeWidth(width);
  };

  // Memoize tools array to prevent re-creation
  const tools = useMemo(() => [
    { id: 'pen', name: 'Pen', icon: '' },
    { id: 'eraser', name: 'Eraser', icon: '' },
    { id: 'rectangle', name: 'Rectangle', icon: '⬛' },
    { id: 'circle', name: 'Circle', icon: '' },
    { id: 'text', name: 'Text', icon: '' },
  ], []);

  // Memoize colors array to prevent re-creation
  const colors = useMemo(() => [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#A52A2A', '#808080', '#FFB6C1'
  ], []);

  // Memoize rendered tools to prevent re-renders
  const renderedTools = useMemo(() => {
    return tools.map((tool) => (
      <button
        key={tool.id}
        onClick={() => handleToolChange(tool.id)}
        disabled={!canEdit}
        className={`p-3 rounded-md text-sm font-medium transition-colors ${
          selectedTool === tool.id
            ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
            : canEdit
              ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
        }`}
        title={canEdit ? tool.name : `${tool.name} (Disabled)`}
      >
        <div className="text-lg mb-1">{tool.icon}</div>
        <div>{tool.name}</div>
      </button>
    ));
  }, [tools, selectedTool, handleToolChange, canEdit]);

  // Memoize rendered colors to prevent re-renders
  const renderedColors = useMemo(() => {
    return colors.map((color) => (
      <button
        key={color}
        onClick={() => handleColorChange(color)}
        disabled={!canEdit}
        className={`w-8 h-8 rounded-md border-2 ${
          selectedColor === color ? 'border-gray-900' : 'border-gray-300'
        } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
        style={{ backgroundColor: color }}
        title={canEdit ? color : `${color} (Disabled)`}
      />
    ));
  }, [colors, selectedColor, handleColorChange, canEdit]);

  if (showCanvas && selectedWhiteboard) {
    return (
      <div className="h-full flex">
        {/*  Show sidebar for all users but disable tools for members */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
          <button
            onClick={handleBackToList}
            className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Whiteboards
          </button>

          {/*  Show user role status */}
          {userRole && (
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-900 mb-1">Your Role</div>
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                userRole === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                userRole === 'ADMIN' ? 'bg-red-100 text-red-800' :
                userRole === 'MEMBER' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {userRole}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {canEdit ? 'Can edit whiteboards' : 'View-only access'}
              </div>
            </div>
          )}

          {/*  Show read-only warning for members */}
          {userRole === 'MEMBER' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-yellow-400 text-sm mr-2"></span>
                <div>
                  <div className="text-sm font-medium text-yellow-800">Read-Only Mode</div>
                  <div className="text-xs text-yellow-700 mt-1">
                    You can view this whiteboard but cannot make changes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tools */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Tools {!canEdit && <span className="text-xs text-gray-500">(Disabled)</span>}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolChange(tool.id)}
                  disabled={!canEdit}
                  className={`p-2 rounded-md text-xs font-medium transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                      : canEdit
                        ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
                  }`}
                  title={canEdit ? tool.name : `${tool.name} (Disabled)`}
                >
                  <div className="text-sm mb-1">{tool.icon}</div>
                  <div className="text-xs">{tool.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Colors {!canEdit && <span className="text-xs text-gray-500">(Disabled)</span>}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  disabled={!canEdit}
                  className={`w-8 h-8 rounded border-2 ${
                    selectedColor === color ? 'border-gray-600' : 'border-gray-300'
                  } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ backgroundColor: color }}
                  title={canEdit ? color : `${color} (Disabled)`}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Stroke Width: {strokeWidth}px {!canEdit && <span className="text-xs text-gray-500">(Disabled)</span>}
            </h4>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              disabled={!canEdit}
              className={`w-full ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1px</span>
              <span>20px</span>
            </div>
          </div>

          {/*  Add drawing statistics for members (view-only info) */}
          {userRole === 'MEMBER' && selectedWhiteboard.metadata && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Whiteboard Stats</h5>
              <div className="space-y-1 text-xs text-blue-800">
                <div>Elements: {selectedWhiteboard.metadata.elementCount || 0}</div>
                <div>Last saved: {selectedWhiteboard.metadata.lastSaved ? new Date(selectedWhiteboard.metadata.lastSaved).toLocaleTimeString() : 'Never'}</div>
                <div>Collaborators: {selectedWhiteboard.collaborators?.length || 0}</div>
              </div>
            </div>
          )}

          {/* Whiteboard Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2">Current Board</h5>
            <p className="text-sm text-gray-600 mb-2">{selectedWhiteboard.boardTitle}</p>
            {selectedWhiteboard.boardDescription && (
              <p className="text-xs text-gray-500">{selectedWhiteboard.boardDescription}</p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Created: {selectedWhiteboard.createdAt ? new Date(selectedWhiteboard.createdAt).toLocaleDateString() : 'Unknown'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Creator: {selectedWhiteboard.creatorId?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1">
          <WhiteboardCanvas whiteboard={selectedWhiteboard} />
        </div>
      </div>
    );
  }

  return <WhiteboardList workspaceId={workspaceId} onWhiteboardSelect={handleWhiteboardSelect} />;
});

WhiteboardMain.displayName = 'WhiteboardMain';

export default WhiteboardMain;