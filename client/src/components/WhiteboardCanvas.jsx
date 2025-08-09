import React, { useState } from 'react';
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
    saveDrawingData
  } = useWhiteboardStore();

  const handleUserCountChange = (count) => {
    setUserCount(count);
  };

  const handleClearCanvas = async () => {
    if (window.confirm('Are you sure you want to clear the entire canvas?')) {
      clearDrawingData();
      if (whiteboard?._id) {
        await saveDrawingData(whiteboard._id, []);
      }
    }
  };

  const tools = [
    { id: 'pen', name: 'Pen', icon: '✏️' },
    { id: 'eraser', name: 'Eraser', icon: '🧽' },
    { id: 'rectangle', name: 'Rectangle', icon: '▭' },
    { id: 'circle', name: 'Circle', icon: '○' },
    { id: 'text', name: 'Text', icon: '📝' },
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

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {/* Tools */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Tools:</span>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                selectedTool === tool.id
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              title={tool.name}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 mr-2">Color:</span>
          {colors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-md border-2 ${
                selectedColor === color ? 'border-gray-900' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Size:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-700 w-8">{strokeWidth}px</span>
        </div>

        {/* Clear Button */}
        <button
          onClick={handleClearCanvas}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
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
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          Tool: {selectedTool} | Color: {selectedColor} | Width: {strokeWidth}px
        </div>
        <div className="text-sm text-gray-600">
          Collaborators: {whiteboard?.collaborators?.length || 0}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;