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
    strokeWidth
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

  // Memoize tools array to prevent re-creation
  const tools = useMemo(() => [
    { id: 'pen', name: 'Pen', icon: '✏️' },
    { id: 'eraser', name: 'Eraser', icon: '🧽' },
    { id: 'rectangle', name: 'Rectangle', icon: '⬛' },
    { id: 'circle', name: 'Circle', icon: '⚪' },
    { id: 'text', name: 'Text', icon: '📝' },
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
        onClick={() => setSelectedTool(tool.id)}
        className={`p-3 rounded-md text-sm font-medium transition-colors ${
          selectedTool === tool.id
            ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="text-lg mb-1">{tool.icon}</div>
        <div>{tool.name}</div>
      </button>
    ));
  }, [tools, selectedTool, setSelectedTool]);

  // Memoize rendered colors to prevent re-renders
  const renderedColors = useMemo(() => {
    return colors.map((color) => (
      <button
        key={color}
        onClick={() => setSelectedColor(color)}
        className={`w-8 h-8 rounded-md border-2 ${
          selectedColor === color ? 'border-gray-900' : 'border-gray-300'
        }`}
        style={{ backgroundColor: color }}
        title={color}
      />
    ));
  }, [colors, selectedColor, setSelectedColor]);

  if (showCanvas && selectedWhiteboard) {
    return (
      <div className="h-full flex">
        {/* Toolbar Sidebar */}
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

          {/* Tools */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderedTools}
            </div>
          </div>

          {/* Colors */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Colors</h4>
            <div className="grid grid-cols-4 gap-2">
              {renderedColors}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Stroke Width: {strokeWidth}px
            </h4>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Whiteboard Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2">Current Board</h5>
            <p className="text-sm text-gray-600 mb-2">{selectedWhiteboard.boardTitle}</p>
            {selectedWhiteboard.boardDescription && (
              <p className="text-xs text-gray-500">{selectedWhiteboard.boardDescription}</p>
            )}
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