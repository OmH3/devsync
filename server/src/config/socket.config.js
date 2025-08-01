import { authenticateSocket } from '../middleware/isAuthenticated.middleware.js';
import { setupWhiteboardHandlers } from '../handlers/whiteboard.handlers.js';
import { setupDocsHandlers } from '../handlers/docs.handlers.js';
import { setupCodeEditorHandlers } from '../handlers/codeeditor.handlers.js';
import { setupWorkspaceHandlers } from '../handlers/workspace.handlers.js';
import { setupVideoCallHandlers } from '../handlers/videocall.handlers.js';

export const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userEmail})`);

    // Setup handlers for different features
    setupWorkspaceHandlers(socket, io);
    setupWhiteboardHandlers(socket, io);
    setupDocsHandlers(socket, io);
    setupCodeEditorHandlers(socket, io);
    setupVideoCallHandlers(socket, io); // ✅ Add this

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};