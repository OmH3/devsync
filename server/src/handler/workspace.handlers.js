import MemberModel from '../../models/Member.model.js';

export const setupWorkspaceHandlers = (socket, io) => {
  // Join workspace room
  socket.on('join-workspace', async (workspaceId) => {
    try {
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
      socket.join(`workspace:${workspaceId}`);
      socket.currentWorkspace = workspaceId;

      // Notify others in workspace
      socket.to(`workspace:${workspaceId}`).emit('user-joined-workspace', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });

      socket.emit('workspace-joined', { workspaceId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join workspace' });
    }
  });

  // Leave workspace room
  socket.on('leave-workspace', (workspaceId) => {
    socket.leave(`workspace:${workspaceId}`);
    socket.to(`workspace:${workspaceId}`).emit('user-left-workspace', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });
};