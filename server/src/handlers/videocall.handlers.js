import WorkspaceModel from '../models/Workspace.model.js';
import MemberModel from '../models/Member.model.js';

export const setupVideoCallHandlers = (socket, io) => {
  // Join video call room
  socket.on('join-video-call-room', async (data) => {
    const { workspaceId, sessionId } = data;
    
    try {
      // Verify user is member and call is active
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId
      });

      if (!member) {
        socket.emit('error', { message: 'Not authorized to join this video call' });
        return;
      }

      const workspace = await WorkspaceModel.findById(workspaceId);
      if (!workspace || workspace.tools.videoCall.sessionId !== sessionId) {
        socket.emit('error', { message: 'Video call session not found' });
        return;
      }

      // Join video call room
      socket.join(`videocall:${sessionId}`);
      socket.currentVideoCall = sessionId;

      // Notify others in the call
      socket.to(`videocall:${sessionId}`).emit('participant-joined', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('video-call-room-joined', { sessionId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join video call room' });
    }
  });

  // WebRTC signaling events
  socket.on('webrtc-offer', (data) => {
    const { sessionId, offer, targetUserId } = data;
    
    // Send offer to specific user
    socket.to(`videocall:${sessionId}`).emit('webrtc-offer', {
      offer,
      fromUserId: socket.userId,
      fromUserName: socket.userName,
      targetUserId
    });
  });

  socket.on('webrtc-answer', (data) => {
    const { sessionId, answer, targetUserId } = data;
    
    // Send answer to specific user
    socket.to(`videocall:${sessionId}`).emit('webrtc-answer', {
      answer,
      fromUserId: socket.userId,
      fromUserName: socket.userName,
      targetUserId
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { sessionId, candidate, targetUserId } = data;
    
    // Send ICE candidate to specific user
    socket.to(`videocall:${sessionId}`).emit('webrtc-ice-candidate', {
      candidate,
      fromUserId: socket.userId,
      fromUserName: socket.userName,
      targetUserId
    });
  });

  // Participant controls
  socket.on('toggle-video', (data) => {
    const { sessionId, isVideoEnabled } = data;
    
    socket.to(`videocall:${sessionId}`).emit('participant-video-toggled', {
      userId: socket.userId,
      userName: socket.userName,
      isVideoEnabled,
      timestamp: new Date()
    });
  });

  socket.on('toggle-audio', (data) => {
    const { sessionId, isAudioEnabled } = data;
    
    socket.to(`videocall:${sessionId}`).emit('participant-audio-toggled', {
      userId: socket.userId,
      userName: socket.userName,
      isAudioEnabled,
      timestamp: new Date()
    });
  });

  socket.on('screen-share-start', (data) => {
    const { sessionId } = data;
    
    socket.to(`videocall:${sessionId}`).emit('participant-screen-share-started', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  socket.on('screen-share-stop', (data) => {
    const { sessionId } = data;
    
    socket.to(`videocall:${sessionId}`).emit('participant-screen-share-stopped', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  // Leave video call
  socket.on('leave-video-call', (sessionId) => {
    socket.leave(`videocall:${sessionId}`);
    socket.to(`videocall:${sessionId}`).emit('participant-left', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });
};