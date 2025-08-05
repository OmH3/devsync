import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const DrawingCanvas = ({ whiteboard, onClose }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  const { 
    drawingData, 
    addDrawingElement, 
    saveDrawingData,
    clearDrawingData,
    setDrawingData 
  } = useWhiteboardStore();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Load existing drawing data
      redrawCanvas();
    }
  }, []);

  // Redraw canvas with existing data
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all existing elements
    drawingData.forEach(element => {
      if (element.type === 'path') {
        drawPath(ctx, element);
      } else if (element.type === 'text') {
        drawText(ctx, element);
      } else if (element.type === 'shape') {
        drawShape(ctx, element);
      }
    });
  }, [drawingData]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawPath = (ctx, element) => {
    if (element.points && element.points.length > 1) {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.lineWidth;
      ctx.beginPath();
      ctx.moveTo(element.points[0].x, element.points[0].y);
      
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y);
      }
      ctx.stroke();
    }
  };

  const drawText = (ctx, element) => {
    ctx.fillStyle = element.color;
    ctx.font = `${element.fontSize || 16}px Arial`;
    ctx.fillText(element.text, element.x, element.y);
  };

  const drawShape = (ctx, element) => {
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    
    if (element.shape === 'rectangle') {
      ctx.strokeRect(element.x, element.y, element.width, element.height);
    } else if (element.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;
    
    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPosition(pos);
  };

  const draw = (e) => {
    if (!isDrawing || (currentTool !== 'pen' && currentTool !== 'eraser')) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPos = getMousePos(e);

    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.lineWidth = currentTool === 'eraser' ? lineWidth * 2 : lineWidth;
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    setLastPosition(currentPos);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    // Save the current canvas state
    if (currentTool === 'pen' || currentTool === 'eraser') {
      saveCurrentDrawing();
    }
  };

  const saveCurrentDrawing = async () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    
    const newElement = {
      id: Date.now().toString(),
      type: 'canvas',
      data: imageData,
      timestamp: new Date().toISOString()
    };

    addDrawingElement(newElement);
    
    // Auto-save to backend
    if (whiteboard?._id) {
      await saveDrawingData(whiteboard._id, [...drawingData, newElement]);
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the entire canvas?')) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clearDrawingData();
      
      if (whiteboard?._id) {
        saveDrawingData(whiteboard._id, []);
      }
    }
  };

  const handleSave = async () => {
    if (whiteboard?._id) {
      const result = await saveDrawingData(whiteboard._id, drawingData);
      if (result.success) {
        alert('Whiteboard saved successfully!');
      } else {
        alert('Failed to save whiteboard');
      }
    }
  };

  const tools = [
    { id: 'pen', name: 'Pen', icon: '✏️' },
    { id: 'eraser', name: 'Eraser', icon: '🧽' },
    { id: 'text', name: 'Text', icon: 'T' },
    { id: 'rectangle', name: 'Rectangle', icon: '▭' },
    { id: 'circle', name: 'Circle', icon: '○' },
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

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
            <h3 className="text-lg font-semibold text-gray-900">{whiteboard?.title}</h3>
            <p className="text-sm text-gray-500">{whiteboard?.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={handleClearCanvas}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {/* Tools */}
        <div className="flex items-center space-x-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                currentTool === tool.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 mr-2">Color:</span>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-8 h-8 rounded-full border-2 ${
                currentColor === color ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-8 h-8 rounded border-2 border-gray-300"
          />
        </div>

        {/* Line Width */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Size:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-700 w-8">{lineWidth}px</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ 
            cursor: currentTool === 'eraser' ? 'crosshair' : 'crosshair'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span>Room ID: {whiteboard?.roomId}</span>
          <span className="ml-4">Collaborators: {whiteboard?.collaborators?.length || 0}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Tool: {currentTool}</span>
          <span>|</span>
          <span>Elements: {drawingData.length}</span>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;