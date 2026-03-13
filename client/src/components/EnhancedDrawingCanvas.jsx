import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const COLORS = ["#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#FFD133"];

const EnhancedDrawingCanvas = ({ 
  whiteboard, 
  selectedTool, 
  selectedColor, 
  strokeWidth,
  onUserCountChange,
  canEdit = false,
  userRole = null
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const textInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursors, setCursors] = useState({});
  const [userCount, setUserCount] = useState(1);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState([]);
  
  const socket = useSocket();
  const userIdRef = useRef(socket?.userId || 'anonymous');
  const colorRef = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const { 
    drawingData = [], 
    addDrawingElement, 
    saveDrawingData,
    clearDrawingData,
    setDrawingData,
    setError
  } = useWhiteboardStore();

  // Auto-focus text input when typing starts
  useEffect(() => {
    if (isTyping && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current.focus();
      }, 50);
    }
  }, [isTyping]);

  // Update refs when props change
  useEffect(() => {
    if (socket?.userId) {
      userIdRef.current = socket.userId;
    }
  }, [socket?.userId]);

  // Load existing drawing data
  useEffect(() => {
    if (whiteboard && whiteboard.boardElements) {
      console.log('Loading existing drawing data:', whiteboard.boardElements);
      setDrawingData(whiteboard.boardElements);
    }
  }, [whiteboard, setDrawingData]);

  // Redraw canvas with existing data
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      // Draw all existing elements
      if (Array.isArray(drawingData) && drawingData.length > 0) {
        console.log('Redrawing canvas with elements:', drawingData.length);
        drawingData.forEach(element => {
          try {
            if (element && element.type) {
              if (element.type === 'path') {
                drawPath(ctx, element);
              } else if (element.type === 'text') {
                drawText(ctx, element);
              } else if (element.type === 'shape') {
                drawShape(ctx, element);
              }
            }
          } catch (err) {
            console.warn('Error drawing element:', element, err);
          }
        });
      }
    } catch (error) {
      console.error('Error in redrawCanvas:', error);
    }
  }, [drawingData]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      try {
        const parent = canvas.parentElement;
        if (parent) {
          const { width, height } = parent.getBoundingClientRect();
          canvas.width = width * window.devicePixelRatio;
          canvas.height = height * window.devicePixelRatio;
          
          const ctx = canvas.getContext('2d');
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctxRef.current = ctx;
          
          // Redraw after resize
          setTimeout(redrawCanvas, 100);
        }
      } catch (error) {
        console.error('Error in resizeCanvas:', error);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawPath = (ctx, element) => {
    try {
      if (element.points && Array.isArray(element.points) && element.points.length > 1) {
        ctx.save();
        ctx.strokeStyle = element.color || '#000000';
        ctx.lineWidth = element.lineWidth || 2;
        ctx.globalCompositeOperation = element.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    } catch (error) {
      console.warn('Error drawing path:', error);
    }
  };

  const drawText = (ctx, element) => {
    try {
      if (element.text && element.x !== undefined && element.y !== undefined) {
        ctx.save();
        ctx.fillStyle = element.color || '#000000';
        ctx.font = `${element.fontSize || 16}px Arial`;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillText(element.text, element.x, element.y);
        ctx.restore();
      }
    } catch (error) {
      console.warn('Error drawing text:', error);
    }
  };

  const drawShape = (ctx, element) => {
    try {
      ctx.save();
      ctx.strokeStyle = element.color || '#000000';
      ctx.lineWidth = element.lineWidth || 2;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]);
      
      if (element.shape === 'rectangle' && element.width !== undefined && element.height !== undefined) {
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      } else if (element.shape === 'circle' && element.radius !== undefined) {
        ctx.beginPath();
        ctx.arc(element.centerX, element.centerY, element.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    } catch (error) {
      console.warn('Error drawing shape:', error);
    }
  };

  const drawPreviewShape = useCallback((currentPos) => {
    try {
      const ctx = ctxRef.current;
      if (!ctx) return;

      // Redraw existing elements first
      redrawCanvas();

      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([5, 5]); // Dashed line for preview

      if (selectedTool === 'rectangle') {
        const width = currentPos.x - startPosition.x;
        const height = currentPos.y - startPosition.y;
        ctx.strokeRect(startPosition.x, startPosition.y, width, height);
      } else if (selectedTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(currentPos.x - startPosition.x, 2) + 
          Math.pow(currentPos.y - startPosition.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPosition.x, startPosition.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    } catch (error) {
      console.warn('Error drawing preview shape:', error);
    }
  }, [selectedTool, selectedColor, strokeWidth, startPosition, redrawCanvas]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Save element and persist to backend
  const saveElement = async (element) => {
    //Check permissions before saving
    if (!canEdit || userRole === 'MEMBER') {
      console.log('Save prevented: User does not have edit permissions');
      setError && setError('You do not have permission to edit this whiteboard');
      return;
    }

    console.log('Saving element:', element);
    
    // Add to local store first
    const success = addDrawingElement(element);
    if (!success) {
      console.log('Failed to add element to local store');
      return;
    }
    
    // Wait for state update and then save to backend
    setTimeout(async () => {
      try {
        const updatedData = [...drawingData, element];
        console.log('Saving to backend, total elements:', updatedData.length);
        
        if (whiteboard?._id) {
          const result = await saveDrawingData(whiteboard._id, updatedData);
          console.log('Save result:', result);
        }
      } catch (error) {
        console.error('Error saving to backend:', error);
      }
    }, 100);
  };

  // Join whiteboard room
  useEffect(() => {
    if (socket && whiteboard?._id) {
      socket.emit('join-whiteboard', whiteboard._id);

      return () => {
        socket.emit('leave-whiteboard', whiteboard._id);
      };
    }
  }, [socket, whiteboard?._id]);

  // Socket event handlers for real-time collaboration
  useEffect(() => {
    if (!socket || !whiteboard?._id) return;

    const handleDrawStart = ({ offsetX, offsetY, color, strokeWidth }) => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
      }
    };

    const handleDrawMove = ({ offsetX, offsetY }) => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      }
    };

    const handleDrawEnd = () => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.closePath();
      }
    };

    const handleClearCanvas = () => {
      const success = clearDrawingData();
      if (success) {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
        }
      }
    };

    const handleUserCount = (count) => {
      setUserCount(count);
      onUserCountChange?.(count);
    };

    const handleCursorUpdate = ({ userId, x, y, color }) => {
      if (userId !== userIdRef.current) {
        setCursors(prev => ({
          ...prev,
          [userId]: { x, y, color, timestamp: Date.now() }
        }));
      }
    };

    const handleWhiteboardJoined = ({ userCount, canEdit: serverCanEdit }) => {
      console.log('Joined whiteboard, user count:', userCount, 'canEdit:', serverCanEdit);
      setUserCount(userCount);
      onUserCountChange?.(userCount);
    };

    const handleSocketError = ({ message }) => {
      console.error('Socket error:', message);
      setError && setError(message);
    };

    // Register event listeners
    socket.on('draw-start', handleDrawStart);
    socket.on('draw-move', handleDrawMove);
    socket.on('draw-end', handleDrawEnd);
    socket.on('clear-canvas', handleClearCanvas);
    socket.on('user-count', handleUserCount);
    socket.on('cursor-update', handleCursorUpdate);
    socket.on('whiteboard-joined', handleWhiteboardJoined);
    socket.on('whiteboard-cleared', handleClearCanvas);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('draw-start', handleDrawStart);
      socket.off('draw-move', handleDrawMove);
      socket.off('draw-end', handleDrawEnd);
      socket.off('clear-canvas', handleClearCanvas);
      socket.off('user-count', handleUserCount);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('whiteboard-joined', handleWhiteboardJoined);
      socket.off('whiteboard-cleared', handleClearCanvas);
      socket.off('error', handleSocketError);
    };
  }, [socket, whiteboard?._id, onUserCountChange, clearDrawingData, setError]);

  // Clean up old cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const filtered = {};
        Object.entries(prev).forEach(([userId, cursor]) => {
          if (now - cursor.timestamp < 5000) {
            filtered[userId] = cursor;
          }
        });
        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  //Mouse event handlers with permission checks
  const startDrawing = useCallback((e) => {
    //Prevent all drawing interactions for members
    if (!canEdit || userRole === 'MEMBER') {
      console.log('Drawing prevented: User does not have edit permissions');
      return;
    }

    // Don't start drawing if we're typing text
    if (isTyping) return;

    const pos = getMousePos(e);
    setStartPosition(pos);

    if (selectedTool === 'text') {
      setIsTyping(true);
      setTextPosition(pos);
      setTextInput('');
      return;
    }

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = selectedTool === 'eraser' ? '#ffffff' : selectedColor;
        ctx.lineWidth = strokeWidth;
        ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
        setIsDrawing(true);
        setCurrentPath([pos]);

        // Emit real-time drawing start
        if (socket?.connected && whiteboard?._id) {
          socket.emit('draw-start', {
            whiteboardId: whiteboard._id,
            offsetX: pos.x,
            offsetY: pos.y,
            color: ctx.strokeStyle,
            strokeWidth: strokeWidth,
          });
        }
      }
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      setIsDrawing(true);
    }
  }, [selectedTool, selectedColor, strokeWidth, socket, whiteboard?._id, isTyping, canEdit, userRole]);

  const draw = useCallback((e) => {
    const currentPos = getMousePos(e);

    //Allow cursor movement for all users (members can see other cursors)
    if (socket?.connected && whiteboard?._id) {
      socket.emit('cursor-move', {
        whiteboardId: whiteboard._id,
        userId: userIdRef.current,
        x: e.clientX,
        y: e.clientY,
        color: colorRef.current,
      });
    }

    //Only prevent actual drawing for members
    if (!canEdit || userRole === 'MEMBER') {
      return;
    }

    // Don't draw if we're typing text
    if (isTyping) return;

    if (!isDrawing) return;

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();

        setCurrentPath(prev => [...prev, currentPos]);

        // Emit real-time drawing move
        if (socket?.connected && whiteboard?._id) {
          socket.emit('draw-move', { 
            whiteboardId: whiteboard._id, 
            offsetX: currentPos.x, 
            offsetY: currentPos.y 
          });
        }
      }
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      drawPreviewShape(currentPos);
    }
  }, [isDrawing, selectedTool, socket, whiteboard?._id, drawPreviewShape, isTyping, canEdit, userRole]);

  const endDrawing = useCallback((e) => {
    //Prevent drawing end for members
    if (!canEdit || userRole === 'MEMBER') return;

    // Don't end drawing if we're typing text
    if (isTyping) return;
    
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const currentPos = getMousePos(e);

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      // Emit real-time drawing end
      if (socket?.connected && whiteboard?._id) {
        socket.emit('draw-end', { whiteboardId: whiteboard._id });
      }

      // Save path to drawing data
      if (currentPath.length > 0) {
        const newElement = {
          id: Date.now().toString(),
          type: 'path',
          tool: selectedTool,
          color: selectedTool === 'eraser' ? '#ffffff' : selectedColor,
          lineWidth: strokeWidth,
          points: currentPath,
          timestamp: new Date().toISOString()
        };
        
        saveElement(newElement);
      }
      setCurrentPath([]);

    } else if (selectedTool === 'rectangle') {
      const width = currentPos.x - startPosition.x;
      const height = currentPos.y - startPosition.y;
      
      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        const newElement = {
          id: Date.now().toString(),
          type: 'shape',
          shape: 'rectangle',
          x: startPosition.x,
          y: startPosition.y,
          width: width,
          height: height,
          color: selectedColor,
          lineWidth: strokeWidth,
          timestamp: new Date().toISOString()
        };

        saveElement(newElement);
        setTimeout(redrawCanvas, 50); // Redraw to remove preview
      }

    } else if (selectedTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(currentPos.x - startPosition.x, 2) + 
        Math.pow(currentPos.y - startPosition.y, 2)
      );
      
      if (radius > 5) {
        const newElement = {
          id: Date.now().toString(),
          type: 'shape',
          shape: 'circle',
          centerX: startPosition.x,
          centerY: startPosition.y,
          radius: radius,
          color: selectedColor,
          lineWidth: strokeWidth,
          timestamp: new Date().toISOString()
        };

        saveElement(newElement);
        setTimeout(redrawCanvas, 50); // Redraw to remove preview
      }
    }
  }, [isDrawing, selectedTool, selectedColor, strokeWidth, startPosition, currentPath, socket, whiteboard?._id, redrawCanvas, saveElement, isTyping, canEdit, userRole]);

  const handleTextSubmit = useCallback(() => {
    //Check permissions before submitting text
    if (!canEdit || userRole === 'MEMBER') {
      console.log('Text submit prevented: User does not have edit permissions');
      setError && setError('You do not have permission to edit this whiteboard');
      setIsTyping(false);
      setTextInput('');
      return;
    }

    if (textInput.trim()) {
      const newElement = {
        id: Date.now().toString(),
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y + 16, // Offset to place text below cursor
        color: selectedColor,
        fontSize: 16,
        timestamp: new Date().toISOString()
      };

      saveElement(newElement);
    }
    
    setIsTyping(false);
    setTextInput('');
  }, [textInput, textPosition, selectedColor, saveElement, canEdit, userRole, setError]);

  // Handle text input key events
  const handleTextKeyDown = useCallback((e) => {
    // Prevent event bubbling to canvas
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setIsTyping(false);
      setTextInput('');
    }
  }, [handleTextSubmit]);

  const handleTextInputChange = useCallback((e) => {
    setTextInput(e.target.value);
  }, []);

  const handleTextInputBlur = useCallback(() => {
    // Only submit if there's text
    if (textInput.trim()) {
      handleTextSubmit();
    } else {
      setIsTyping(false);
      setTextInput('');
    }
  }, [textInput, handleTextSubmit]);

  // Prevent canvas events when text input is focused
  const handleCanvasMouseDown = useCallback((e) => {
    // Don't interfere if clicking on text input
    if (isTyping && textInputRef.current) {
      const inputRect = textInputRef.current.getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      if (
        clickX >= inputRect.left &&
        clickX <= inputRect.right &&
        clickY >= inputRect.top &&
        clickY <= inputRect.bottom
      ) {
        return; // Don't start drawing if clicking on text input
      }
    }
    
    startDrawing(e);
  }, [startDrawing, isTyping]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        className={`absolute inset-0 w-full h-full bg-white ${
          canEdit && userRole !== 'MEMBER' ? 'cursor-crosshair' : 'cursor-default'
        } ${selectedTool === 'text' && canEdit && userRole !== 'MEMBER' ? 'cursor-text' : ''}`}
      />
      
      {/* Text Input Overlay - Only show for users who can edit */}
      {isTyping && canEdit && userRole !== 'MEMBER' && (
        <div
          className="absolute bg-white border-2 border-indigo-500 rounded-lg px-3 py-2 shadow-xl z-50"
          style={{
            left: `${Math.max(0, Math.min(textPosition.x - 75, window.innerWidth - 200))}px`,
            top: `${Math.max(10, textPosition.y - 50)}px`,
            minWidth: '200px',
            maxWidth: '300px',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent canvas events
        >
          <div className="text-xs text-gray-500 mb-1">Type text and press Enter</div>
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={handleTextInputChange}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextInputBlur}
            className="border-none outline-none bg-transparent w-full text-base font-medium"
            placeholder="Enter text..."
            style={{ color: selectedColor }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <div className="text-xs text-gray-400 mt-1">
            Press ESC to cancel
          </div>
        </div>
      )}
      
      {/* User Cursors - Show for all users */}
      {Object.entries(cursors).map(([userId, { x, y, color }]) => (
        <div
          key={userId}
          className="pointer-events-none fixed z-40"
          style={{
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-3 h-3 rounded-full border border-white shadow-lg"
            style={{ backgroundColor: color }}
          />
          <div className="text-xs text-white bg-black bg-opacity-75 rounded px-2 py-1 mt-1 whitespace-nowrap">
            User {userId.substring(0, 6)}
          </div>
        </div>
      ))}
      
      {/* User Count Display */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium pointer-events-none z-30">
         {userCount} user{userCount !== 1 ? 's' : ''}
        {userRole === 'MEMBER' && (
          <div className="text-xs mt-1 text-yellow-300">
            (View Only)
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-30">
        Elements: {drawingData.length} | Tool: {selectedTool}
        {userRole && (
          <div className="mt-1">
            Role: {userRole} | Edit: {canEdit ? 'Yes' : 'No'}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDrawingCanvas;