import MemberModel from '../models/Member.model.js';

export const setupWorkspaceHandlers = (socket, io) => {
  // Join workspace room
  socket.on('join-workspace', async (payload) => {
    try {
      const workspaceId = typeof payload === 'object' && payload !== null ? payload.workspaceId : payload;
      if (!workspaceId) {
        socket.emit('error', { message: 'Missing workspaceId' });
        return;
      }
      // Verify user is member of workspace
      const member = await MemberModel.findOne({
        userId: socket.userId,
        workspaceId
      }).populate('role');

      if (!member) {
        socket.emit('error', { message: 'Not authorized to join this workspace' });
        return;
      }

      // Join workspace room
      const roomName = `workspace:${workspaceId}`;
      socket.join(roomName);
      socket.currentWorkspace = workspaceId;

      const userCount = io.sockets.adapter.rooms.get(roomName)?.size || 1;

      // Notify others in workspace
      socket.to(roomName).emit('user-joined-workspace', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('workspace-joined', { workspaceId, userCount });
      io.to(roomName).emit('workspace-user-count', { workspaceId, userCount });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join workspace' });
    }
  });

  // Leave workspace room
  socket.on('leave-workspace', (payload) => {
    const workspaceId = typeof payload === 'object' && payload !== null ? payload.workspaceId : payload;
    if (!workspaceId) return;
    const roomName = `workspace:${workspaceId}`;
    socket.leave(roomName);
    const userCount = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    socket.to(roomName).emit('user-left-workspace', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
    io.to(roomName).emit('workspace-user-count', { workspaceId, userCount });
  });
};