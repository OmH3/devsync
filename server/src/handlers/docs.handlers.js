import DocModel from '../models/Docs.model.js';
import MemberModel from '../models/Member.model.js';

// Global room users tracking for documents
const roomUsers = {};

export const setupDocsHandlers = (socket, io) => {
  
  // Join document room
  socket.on('join-doc', async (docId) => {
    try {
      console.log(`📄 User ${socket.userId?.slice(-8)} attempting to join document ${docId}`);
      
      const doc = await DocModel.findById(docId);
      if (!doc || !doc.isActive) {
        console.log(`❌ Document ${docId} not found or inactive`);
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Check if user has access
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId: doc.workspaceId
      });

      if (!member) {
        console.log(`❌ User ${socket.userId?.slice(-8)} not authorized for document ${docId}`);
        socket.emit('error', { message: 'Not authorized to access this document' });
        return;
      }

      const roomId = `doc:${docId}`;
      
      // Leave previous document if any
      if (socket.currentDoc) {
        const oldRoomId = `doc:${socket.currentDoc}`;
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

      // Join new document room
      socket.join(roomId);
      socket.currentDoc = docId;

      // Track users in room
      if (!roomUsers[roomId]) {
        roomUsers[roomId] = new Set();
      }
      roomUsers[roomId].add(socket.id);

      const userCount = roomUsers[roomId].size;

      // Notify others about user joining
      socket.to(roomId).emit('user-joined-doc', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      // Send confirmation and user count
      socket.emit('doc-joined', { 
        docId,
        userCount 
      });
      
      // Broadcast user count to all users in room
      io.to(roomId).emit('user-count', userCount);

      console.log(`✅ User ${socket.userId?.slice(-8)} joined document ${docId}, room size: ${userCount}`);
    } catch (error) {
      console.error('❌ Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Real-time text editing
  socket.on('doc-text-change', (data) => {
    const { docId, title, content, operation } = data;
    const roomId = `doc:${docId}`;
    
    console.log(`📝 Text change in doc ${docId} by user ${socket.userId?.slice(-8)}`);
    
    socket.to(roomId).emit('doc-text-changed', {
      docId,
      title,
      content,
      operation,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Cursor position in document
  socket.on('doc-cursor-change', (data) => {
    const { docId, position, selection } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-cursor-changed', {
      userId: socket.userId,
      userName: socket.userName,
      position,
      selection,
      timestamp: new Date()
    });
  });

  // Document save notification
  socket.on('doc-save', (data) => {
    const { docId, title, content } = data;
    const roomId = `doc:${docId}`;
    
    console.log(`💾 Document ${docId} saved by user ${socket.userId?.slice(-8)}`);
    
    socket.to(roomId).emit('doc-saved', {
      docId,
      title,
      content,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Document auto-save notification (for frequent saves)
  socket.on('doc-auto-save', (data) => {
    const { docId, title, content } = data;
    const roomId = `doc:${docId}`;
    
    // Don't log auto-saves to avoid spam
    socket.to(roomId).emit('doc-auto-saved', {
      docId,
      title,
      content,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Selection change (text selection highlighting)
  socket.on('doc-selection-change', (data) => {
    const { docId, selection } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-selection-changed', {
      userId: socket.userId,
      userName: socket.userName,
      selection,
      timestamp: new Date()
    });
  });

  // Typing indicator
  socket.on('doc-typing-start', (data) => {
    const { docId } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-user-typing', {
      userId: socket.userId,
      userName: socket.userName,
      isTyping: true,
      timestamp: new Date()
    });
  });

  socket.on('doc-typing-stop', (data) => {
    const { docId } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-user-typing', {
      userId: socket.userId,
      userName: socket.userName,
      isTyping: false,
      timestamp: new Date()
    });
  });

  // Comment system (if needed)
  socket.on('doc-add-comment', (data) => {
    const { docId, comment, position } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-comment-added', {
      comment,
      position,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  socket.on('doc-resolve-comment', (data) => {
    const { docId, commentId } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-comment-resolved', {
      commentId,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Document formatting changes
  socket.on('doc-format-change', (data) => {
    const { docId, format, range } = data;
    const roomId = `doc:${docId}`;
    
    socket.to(roomId).emit('doc-format-changed', {
      format,
      range,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Leave document
  socket.on('leave-doc', (docId) => {
    const roomId = `doc:${docId}`;
    socket.leave(roomId);
    
    console.log(`🚪 User ${socket.userId?.slice(-8)} leaving document ${docId}`);
    
    // Update user count
    if (roomUsers[roomId]) {
      roomUsers[roomId].delete(socket.id);
      if (roomUsers[roomId].size === 0) {
        delete roomUsers[roomId];
      } else {
        io.to(roomId).emit('user-count', roomUsers[roomId].size);
      }
    }
    
    socket.to(roomId).emit('user-left-doc', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });

    // Clear current doc
    if (socket.currentDoc === docId) {
      socket.currentDoc = null;
    }
  });

  // Handle disconnect - cleanup document rooms
  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.userId?.slice(-8)} disconnected, cleaning up document rooms`);
    
    if (socket.currentDoc) {
      const roomId = `doc:${socket.currentDoc}`;
      
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
        } else {
          io.to(roomId).emit('user-count', roomUsers[roomId].size);
        }
      }
      
      socket.to(roomId).emit('user-left-doc', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });
    }
  });

  // Legacy events for backwards compatibility
  socket.on('document-join', (docId) => {
    // Redirect to new event
    socket.emit('join-doc', docId);
  });

  socket.on('document-leave', (docId) => {
    // Redirect to new event
    socket.emit('leave-doc', docId);
  });

  socket.on('document-text-update', (data) => {
    // Redirect to new event
    socket.emit('doc-text-change', data);
  });
};