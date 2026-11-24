//Global room users tracking for filesystem items
const fileSystemRoomUsers = {};

export const setupFileSystemHandlers = (socket, io) => {

  //Join filesystem item room (for collaborative file editing)
  socket.on('join-filesystem-item', async (fileSystemId) => {
    try {

      if (!socket.userId || !fileSystemId) {
        socket.emit('error', { message: 'Missing userId or fileSystemId' });
        return;
      }

      // Join the room
      socket.join(`filesystem:${fileSystemId}`);
      socket.currentFileSystemId = fileSystemId;

      //Track users in room
      if (!fileSystemRoomUsers[fileSystemId]) {
        fileSystemRoomUsers[fileSystemId] = [];
      }

      // Remove user if already in room
      fileSystemRoomUsers[fileSystemId] = fileSystemRoomUsers[fileSystemId].filter(
        user => user.userId !== socket.userId
      );

      // Add user to room
      const userInfo = {
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        socketId: socket.id,
        joinedAt: new Date()
      };
      fileSystemRoomUsers[fileSystemId].push(userInfo);

      //Notify user they successfully joined
      socket.emit('filesystem-item-joined', {
        fileSystemId,
        userCount: fileSystemRoomUsers[fileSystemId].length,
        users: fileSystemRoomUsers[fileSystemId]
      });

      //Notify other users
      socket.to(`filesystem:${fileSystemId}`).emit('user-joined-filesystem-item', {
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        fileSystemId
      });

      //Send updated user count
      io.to(`filesystem:${fileSystemId}`).emit('user-count', fileSystemRoomUsers[fileSystemId].length);

    } catch (error) {

      socket.emit('error', { message: 'Failed to join filesystem item' });
    }
  });

  //Leave filesystem item room
  socket.on('leave-filesystem-item', (fileSystemId) => {
    try {
      handleLeaveFileSystemItem(socket, io, fileSystemId);
    } catch (error) {

    }
  });

  //Handle filesystem structure changes
  socket.on('filesystem-structure-change', (data) => {
    try {
      const { workspaceId, operation, item, oldPath, newPath } = data;
      
      if (!socket.userId || !workspaceId) {
        socket.emit('error', { message: 'Unauthorized or missing data' });
        return;
      }

      //Broadcast to workspace members
      socket.to(`workspace-${workspaceId}`).emit('filesystem-structure-changed', {
        workspaceId,
        operation, // 'create', 'delete', 'rename', 'move'
        item,
        oldPath,
        newPath,
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        timestamp: Date.now()
      });

    } catch (error) {

    }
  });

  //Handle file content changes
  socket.on('filesystem-content-change', (data) => {
    try {
      const { fileSystemId, content, operation, cursorPosition } = data;
      
      if (!socket.userId || !fileSystemId) {
        socket.emit('error', { message: 'Unauthorized or missing data' });
        return;
      }

      //Broadcast to other users viewing the same file
      socket.to(`filesystem:${fileSystemId}`).emit('filesystem-content-changed', {
        fileSystemId,
        content,
        operation,
        cursorPosition,
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        timestamp: Date.now()
      });

    } catch (error) {

    }
  });

  //Handle file save notifications
  socket.on('filesystem-save', (data) => {
    try {
      const { fileSystemId, content } = data;
      
      if (!socket.userId || !fileSystemId) return;

      //Notify other users about save
      socket.to(`filesystem:${fileSystemId}`).emit('filesystem-saved', {
        fileSystemId,
        content,
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        timestamp: Date.now()
      });

    } catch (error) {

    }
  });

  //Handle disconnect
  socket.on('disconnect', () => {
    try {
      if (socket.currentFileSystemId) {
        handleLeaveFileSystemItem(socket, io, socket.currentFileSystemId);
      }
    } catch (error) {

    }
  });
};

//Helper function to handle leaving filesystem item
function handleLeaveFileSystemItem(socket, io, fileSystemId) {
  if (!fileSystemId || !fileSystemRoomUsers[fileSystemId]) return;

  // Remove user from room tracking
  fileSystemRoomUsers[fileSystemId] = fileSystemRoomUsers[fileSystemId].filter(
    user => user.userId !== socket.userId
  );

  // Leave the socket room
  socket.leave(`filesystem:${fileSystemId}`);
  socket.currentFileSystemId = null;

  //Notify other users
  socket.to(`filesystem:${fileSystemId}`).emit('user-left-filesystem-item', {
    userId: socket.userId,
    userName: socket.userName || socket.userEmail,
    fileSystemId
  });

  //Send updated user count
  const remainingUsers = fileSystemRoomUsers[fileSystemId].length;
  io.to(`filesystem:${fileSystemId}`).emit('user-count', remainingUsers);

  // Clean up empty rooms
  if (remainingUsers === 0) {
    delete fileSystemRoomUsers[fileSystemId];
  }

}

//Export room users for debugging
export { fileSystemRoomUsers };