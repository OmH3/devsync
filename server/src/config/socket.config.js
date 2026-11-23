import { authenticateSocket } from '../middleware/isAuthenticated.middleware.js';
import { setupWhiteboardHandlers } from '../handlers/whiteboard.handlers.js';
import { setupDocsHandlers } from '../handlers/docs.handlers.js';
import { setupCodeEditorHandlers } from '../handlers/codeeditor.handlers.js';
import { setupFileSystemHandlers } from '../handlers/filesystem.handlers.js';
import { setupWorkspaceHandlers } from '../handlers/workspace.handlers.js';
import { setupAudioRoomHandlers } from '../handlers/audioroom.handlers.js';
import { Server } from 'socket.io';
import { config } from './app.config.js';
import { sessionEvents } from '../auth/sessions.js';
import { verifySessionToken } from '../utils/jwt.js';

export const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const revoke = sid => { if (sid === socket.sessionId) socket.disconnect(true); };
    sessionEvents.on('revoked', revoke);
    const check = setInterval(() => {
      verifySessionToken(socket.sessionToken).catch(() => socket.disconnect(true));
    }, 10000);
    check.unref();
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.sessionExpiresAt - Date.now()));
    expiry.unref();
    socket.once('disconnect', () => {
      sessionEvents.off('revoked', revoke);
      clearInterval(check);
      clearTimeout(expiry);
    });
    console.log(`User connected: ${socket.userId} (${socket.userEmail})`);

    // Setup handlers for different features
    setupWorkspaceHandlers(socket, io);
    setupWhiteboardHandlers(socket, io);
    setupDocsHandlers(socket, io);
    setupCodeEditorHandlers(socket, io);
    setupFileSystemHandlers(socket, io);
    //FIX: Remove the third parameter
    if (config.AUDIO_ENABLED) setupAudioRoomHandlers(socket, io);

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
