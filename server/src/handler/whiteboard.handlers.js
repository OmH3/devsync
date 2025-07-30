import WhiteboardModel from '../../models/Whiteboard.model.js';
import MemberModel from '../../models/Member.model.js';

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

      // Join room
      socket.join(`whiteboard:${whiteboardId}`);
      socket.currentWhiteboard = whiteboardId;

      // Notify others
      socket.to(`whiteboard:${whiteboardId}`).emit('user-joined-whiteboard', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('whiteboard-joined', { whiteboardId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join whiteboard' });
    }
  });

  // Real-time drawing events
  socket.on('whiteboard-draw', (data) => {
    const { whiteboardId, element } = data;
    
    // Broadcast to all users in the whiteboard except sender
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard-element-added', {
      element,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Element updates (move, resize, etc.)
  socket.on('whiteboard-update-element', (data) => {
    const { whiteboardId, elementId, updates } = data;
    
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard-element-updated', {
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
    
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard-element-deleted', {
      elementId,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Canvas clear
  socket.on('whiteboard-clear', (data) => {
    const { whiteboardId } = data;
    
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard-cleared', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Cursor position sharing
  socket.on('whiteboard-cursor-move', (data) => {
    const { whiteboardId, position } = data;
    
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard-cursor-moved', {
      userId: socket.userId,
      userName: socket.userName,
      position,
      timestamp: new Date()
    });
  });

  // Leave whiteboard
  socket.on('leave-whiteboard', (whiteboardId) => {
    socket.leave(`whiteboard:${whiteboardId}`);
    socket.to(`whiteboard:${whiteboardId}`).emit('user-left-whiteboard', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });
};