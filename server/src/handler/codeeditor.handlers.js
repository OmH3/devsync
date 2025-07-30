import CodeEditorModel from '../../models/CodeEditor.model.js';
import MemberModel from '../../models/Member.model.js';

export const setupCodeEditorHandlers = (socket, io) => {
  // Join code editor room
  socket.on('join-code-editor', async (codeEditorId) => {
    try {
      const codeEditor = await CodeEditorModel.findById(codeEditorId);
      if (!codeEditor || !codeEditor.isActive) {
        socket.emit('error', { message: 'Code editor not found' });
        return;
      }

      // Check access
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId: codeEditor.workspaceId
      });

      if (!member) {
        socket.emit('error', { message: 'Not authorized to access this code editor' });
        return;
      }

      socket.join(`editor:${codeEditorId}`);
      socket.currentEditor = codeEditorId;

      // Notify others
      socket.to(`editor:${codeEditorId}`).emit('user-joined-editor', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('editor-joined', { codeEditorId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join code editor' });
    }
  });

  // Real-time code editing
  socket.on('code-change', (data) => {
    const { codeEditorId, operation, content } = data;
    
    socket.to(`editor:${codeEditorId}`).emit('code-changed', {
      operation,
      content,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Cursor position in code
  socket.on('code-cursor-change', (data) => {
    const { codeEditorId, position, selection } = data;
    
    socket.to(`editor:${codeEditorId}`).emit('code-cursor-changed', {
      userId: socket.userId,
      userName: socket.userName,
      position,
      selection,
      timestamp: new Date()
    });
  });

  // Code execution notification
  socket.on('code-execution-start', (data) => {
    const { codeEditorId } = data;
    
    socket.to(`editor:${codeEditorId}`).emit('code-execution-started', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  socket.on('code-execution-complete', (data) => {
    const { codeEditorId, result } = data;
    
    socket.to(`editor:${codeEditorId}`).emit('code-execution-completed', {
      userId: socket.userId,
      userName: socket.userName,
      result,
      timestamp: new Date()
    });
  });

  // Language change
  socket.on('code-language-change', (data) => {
    const { codeEditorId, language } = data;
    
    socket.to(`editor:${codeEditorId}`).emit('code-language-changed', {
      language,
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Leave code editor
  socket.on('leave-code-editor', (codeEditorId) => {
    socket.leave(`editor:${codeEditorId}`);
    socket.to(`editor:${codeEditorId}`).emit('user-left-editor', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });
};