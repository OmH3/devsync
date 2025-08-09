import WhiteboardModel from '../models/Whiteboard.model.js';
import MemberModel from '../models/Member.model.js';

// Global room users tracking
const roomUsers = {};

export const setupWhiteboardHandlers = (socket, io) => {
  // Join whiteboard room
  socket.on('join-whiteboard', async (whiteboardId) => {
    try {
      const whiteboard = await WhiteboardModel.findById(whiteboardId);
      if (!whiteboard || !whiteboard.isActive) {
        socket.emit('error', { message: 'Whiteboard not found' });
        return;
      }

      // Check if user has access
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId: whiteboard.workspaceId
      });

      if (!member) {
        socket.emit('error', { message: 'Not authorized to access this whiteboard' });
        return;
      }

      const roomId = `whiteboard:${whiteboardId}`;
      
      // Leave previous whiteboard if any
      if (socket.currentWhiteboard) {
        const oldRoomId = `whiteboard:${socket.currentWhiteboard}`;
        socket.leave(oldRoomId);
        if (roomUsers[oldRoomId]) {
          roomUsers[oldRoomId].delete(socket.id);
          if (roomUsers[oldRoomId].size === 0) {
            delete roomUsers[oldRoomId];
          } else {
            io.to(oldRoomId).emit('user-count', roomUsers[oldRoomId].size);
          }
        }
      }

      // Join new room
      socket.join(roomId);
      socket.currentWhiteboard = whiteboardId;

      // Track users in room
      if (!roomUsers[roomId]) {
        roomUsers[roomId] = new Set();
      }
      roomUsers[roomId].add(socket.id);

      const userCount = roomUsers[roomId].size;

      // Notify others about user joining
      socket.to(roomId).emit('user-joined-whiteboard', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      // Send confirmation and user count
      socket.emit('whiteboard-joined', { 
        whiteboardId,
        userCount 
      });
      
      // Broadcast user count to all users in room
      io.to(roomId).emit('user-count', userCount);

      console.log(`User ${socket.userId} joined whiteboard ${whiteboardId}, room size: ${userCount}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join whiteboard' });
    }
  });

  // Real-time drawing events
  socket.on('draw-start', (data) => {
    const { whiteboardId, offsetX, offsetY, color, strokeWidth } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('draw-start', {
      offsetX,
      offsetY,
      color,
      strokeWidth,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  socket.on('draw-move', (data) => {
    const { whiteboardId, offsetX, offsetY } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('draw-move', {
      offsetX,
      offsetY,
      userId: socket.userId
    });
  });

  socket.on('draw-end', (data) => {
    const { whiteboardId } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('draw-end', {
      userId: socket.userId
    });
  });

  // Legacy drawing events (for backwards compatibility)
  socket.on('whiteboard-draw', (data) => {
    const { whiteboardId, element } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('whiteboard-element-added', {
      element,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Element updates (move, resize, etc.)
  socket.on('whiteboard-update-element', (data) => {
    const { whiteboardId, elementId, updates } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('whiteboard-element-updated', {
      elementId,
      updates,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Element deletion
  socket.on('whiteboard-delete-element', (data) => {
    const { whiteboardId, elementId } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('whiteboard-element-deleted', {
      elementId,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Canvas clear
  socket.on('clear-canvas', (data) => {
    const { whiteboardId } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    io.to(roomId).emit('clear-canvas', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Legacy canvas clear
  socket.on('whiteboard-clear', (data) => {
    const { whiteboardId } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    io.to(roomId).emit('whiteboard-cleared', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Cursor position sharing
  socket.on('cursor-move', (data) => {
    const { whiteboardId, userId, x, y, color } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('cursor-update', {
      userId: userId || socket.userId,
      userName: socket.userName,
      x,
      y,
      color,
      timestamp: new Date()
    });
  });

  // Legacy cursor events
  socket.on('whiteboard-cursor-move', (data) => {
    const { whiteboardId, position } = data;
    const roomId = `whiteboard:${whiteboardId}`;
    
    socket.to(roomId).emit('whiteboard-cursor-moved', {
      userId: socket.userId,
      userName: socket.userName,
      position,
      timestamp: new Date()
    });
  });

  // Leave whiteboard
  socket.on('leave-whiteboard', (whiteboardId) => {
    const roomId = `whiteboard:${whiteboardId}`;
    socket.leave(roomId);
    
    // Update user count
    if (roomUsers[roomId]) {
      roomUsers[roomId].delete(socket.id);
      if (roomUsers[roomId].size === 0) {
        delete roomUsers[roomId];
      } else {
        io.to(roomId).emit('user-count', roomUsers[roomId].size);
      }
    }
    
    socket.to(roomId).emit('user-left-whiteboard', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.currentWhiteboard) {
      const roomId = `whiteboard:${socket.currentWhiteboard}`;
      
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
        } else {
          io.to(roomId).emit('user-count', roomUsers[roomId].size);
        }
      }
      
      socket.to(roomId).emit('user-left-whiteboard', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });
    }
  });
};