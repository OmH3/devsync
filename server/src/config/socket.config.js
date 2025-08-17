import { authenticateSocket } from '../middleware/isAuthenticated.middleware.js';
import { setupWhiteboardHandlers } from '../handlers/whiteboard.handlers.js';
import { setupDocsHandlers } from '../handlers/docs.handlers.js';
import { setupCodeEditorHandlers } from '../handlers/codeeditor.handlers.js';
import { setupFileSystemHandlers } from '../handlers/filesystem.handlers.js';
import { setupWorkspaceHandlers } from '../handlers/workspace.handlers.js';
import { setupAudioRoomHandlers } from '../handlers/audioroom.handlers.js';
import { Server } from 'socket.io';
import { setupCallSocketEvents } from '../controllers/stream.controller.js';

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
    setupFileSystemHandlers(socket, io);
    setupCallSocketEvents(socket);
    // ✅ FIX: Remove the third parameter
    setupAudioRoomHandlers(socket, io);

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