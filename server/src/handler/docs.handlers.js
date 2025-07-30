import DocModel from '../../models/Docs.model.js';
import MemberModel from '../../models/Member.model.js';

export const setupDocsHandlers = (socket, io) => {
  // Join document room
  socket.on('join-doc', async (docId) => {
    try {
      const doc = await DocModel.findById(docId);
      if (!doc || !doc.isActive) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Check access
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId: doc.workspaceId
      });

      if (!member) {
        socket.emit('error', { message: 'Not authorized to access this document' });
        return;
      }

      socket.join(`doc:${docId}`);
      socket.currentDoc = docId;

      // Notify others
      socket.to(`doc:${docId}`).emit('user-joined-doc', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('doc-joined', { docId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Real-time text editing (operational transformation)
  socket.on('doc-text-change', (data) => {
    const { docId, operation, content } = data;
    
    // Broadcast text changes
    socket.to(`doc:${docId}`).emit('doc-text-changed', {
      operation,
      content,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Cursor position in document
  socket.on('doc-cursor-change', (data) => {
    const { docId, position, selection } = data;
    
    socket.to(`doc:${docId}`).emit('doc-cursor-changed', {
      userId: socket.userId,
      userName: socket.userName,
      position,
      selection,
      timestamp: new Date()
    });
  });

  // Document save notification
  socket.on('doc-save', (data) => {
    const { docId } = data;
    
    socket.to(`doc:${docId}`).emit('doc-saved', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Leave document
  socket.on('leave-doc', (docId) => {
    socket.leave(`doc:${docId}`);
    socket.to(`doc:${docId}`).emit('user-left-doc', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });
};