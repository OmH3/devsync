import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const WhiteboardCanvas = ({ whiteboard }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  
  const { 
    canvasElements,
    selectedTool,
    selectedColor,
    strokeWidth,
    addCanvasElement,
    updateWhiteboard
  } = useWhiteboardStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all elements
    canvasElements.forEach(element => {
      drawElement(ctx, element);
    });
  }, [canvasElements]);

  const drawElement = (ctx, element) => {
    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'path':
        ctx.beginPath();
        element.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        break;
      
      case 'rectangle':
        ctx.strokeRect(
          element.x,
          element.y,
          element.width,
          element.height
        );
        break;
      
      case 'circle':
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      
      case 'text':
        ctx.font = `${element.fontSize}px Arial`;
        ctx.fillStyle = element.color;
        ctx.fillText(element.text, element.x, element.y);
        break;
    }
  };

  const getMousePosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePosition(e);
    setIsDrawing(true);
    setLastPosition(pos);

    if (selectedTool === 'pen') {
      const newElement = {
        id: `element_${Date.now()}`,
        type: 'path',
        points: [pos],
        color: selectedColor,
        strokeWidth: strokeWidth,
        timestamp: new Date()
      };
      addCanvasElement(newElement);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = getMousePosition(e);

    if (selectedTool === 'pen') {
      const lastElement = canvasElements[canvasElements.length - 1];
      if (lastElement && lastElement.type === 'path') {
        const updatedElement = {
          ...lastElement,
          points: [...lastElement.points, pos]
        };
        
        // Update the last element
        const updatedElements = [...canvasElements.slice(0, -1), updatedElement];
        useWhiteboardStore.getState().setCanvasElements(updatedElements);
      }
    }

    setLastPosition(pos);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    
    // Save to backend
    if (whiteboard && canvasElements.length > 0) {
      updateWhiteboard(whiteboard._id, {
        boardElements: canvasElements
      });
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      useWhiteboardStore.getState().clearCanvas();
      
      if (whiteboard) {
        updateWhiteboard(whiteboard._id, {
          boardElements: []
        });
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {whiteboard?.boardTitle || 'Whiteboard'}
          </h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleClearCanvas}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          Elements: {canvasElements.length}
        </div>
        <div className="text-sm text-gray-600">
          Tool: {selectedTool} | Color: {selectedColor} | Width: {strokeWidth}px
        </div>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;