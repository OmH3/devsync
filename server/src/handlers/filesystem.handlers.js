// ✅ Global room users tracking for filesystem items
const fileSystemRoomUsers = {};

export const setupFileSystemHandlers = (socket, io) => {
  console.log('📁 Setting up File System handlers for socket:', socket.id);

  // ✅ Join filesystem item room (for collaborative file editing)
  socket.on('join-filesystem-item', async (fileSystemId) => {
    try {
      console.log(`👤 User ${socket.userId} joining filesystem item: ${fileSystemId}`);
      
      if (!socket.userId || !fileSystemId) {
        socket.emit('error', { message: 'Missing userId or fileSystemId' });
        return;
      }

      // Join the room
      socket.join(`filesystem:${fileSystemId}`);
      socket.currentFileSystemId = fileSystemId;

      // ✅ Track users in room
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

      // ✅ Notify user they successfully joined
      socket.emit('filesystem-item-joined', {
        fileSystemId,
        userCount: fileSystemRoomUsers[fileSystemId].length,
        users: fileSystemRoomUsers[fileSystemId]
      });

      // ✅ Notify other users
      socket.to(`filesystem:${fileSystemId}`).emit('user-joined-filesystem-item', {
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        fileSystemId
      });

      // ✅ Send updated user count
      io.to(`filesystem:${fileSystemId}`).emit('user-count', fileSystemRoomUsers[fileSystemId].length);

      console.log(`✅ User ${socket.userId} joined filesystem item ${fileSystemId}. Total users: ${fileSystemRoomUsers[fileSystemId].length}`);

    } catch (error) {
      console.error('❌ Error joining filesystem item:', error);
      socket.emit('error', { message: 'Failed to join filesystem item' });
    }
  });

  // ✅ Leave filesystem item room
  socket.on('leave-filesystem-item', (fileSystemId) => {
    try {
      handleLeaveFileSystemItem(socket, io, fileSystemId);
    } catch (error) {
      console.error('❌ Error leaving filesystem item:', error);
    }
  });

  // ✅ Handle filesystem structure changes
  socket.on('filesystem-structure-change', (data) => {
    try {
      const { workspaceId, operation, item, oldPath, newPath } = data;
      
      if (!socket.userId || !workspaceId) {
        socket.emit('error', { message: 'Unauthorized or missing data' });
        return;
      }

      console.log(`📁 Filesystem structure change from ${socket.userId} in workspace ${workspaceId}`);

      // ✅ Broadcast to workspace members
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
      console.error('❌ Error handling filesystem structure change:', error);
    }
  });

  // ✅ Handle file content changes
  socket.on('filesystem-content-change', (data) => {
    try {
      const { fileSystemId, content, operation, cursorPosition } = data;
      
      if (!socket.userId || !fileSystemId) {
        socket.emit('error', { message: 'Unauthorized or missing data' });
        return;
      }

      console.log(`📝 File content change from ${socket.userId} in file ${fileSystemId}`);

      // ✅ Broadcast to other users viewing the same file
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
      console.error('❌ Error handling file content change:', error);
    }
  });

  // ✅ Handle file save notifications
  socket.on('filesystem-save', (data) => {
    try {
      const { fileSystemId, content } = data;
      
      if (!socket.userId || !fileSystemId) return;

      console.log(`💾 File saved by ${socket.userId}: ${fileSystemId}`);

      // ✅ Notify other users about save
      socket.to(`filesystem:${fileSystemId}`).emit('filesystem-saved', {
        fileSystemId,
        content,
        userId: socket.userId,
        userName: socket.userName || socket.userEmail,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error handling file save notification:', error);
    }
  });

  // ✅ Handle disconnect
  socket.on('disconnect', () => {
    try {
      if (socket.currentFileSystemId) {
        handleLeaveFileSystemItem(socket, io, socket.currentFileSystemId);
      }
    } catch (error) {
      console.error('❌ Error handling filesystem disconnect:', error);
    }
  });
};

// ✅ Helper function to handle leaving filesystem item
function handleLeaveFileSystemItem(socket, io, fileSystemId) {
  if (!fileSystemId || !fileSystemRoomUsers[fileSystemId]) return;

  console.log(`👋 User ${socket.userId} leaving filesystem item: ${fileSystemId}`);

  // Remove user from room tracking
  fileSystemRoomUsers[fileSystemId] = fileSystemRoomUsers[fileSystemId].filter(
    user => user.userId !== socket.userId
  );

  // Leave the socket room
  socket.leave(`filesystem:${fileSystemId}`);
  socket.currentFileSystemId = null;

  // ✅ Notify other users
  socket.to(`filesystem:${fileSystemId}`).emit('user-left-filesystem-item', {
    userId: socket.userId,
    userName: socket.userName || socket.userEmail,
    fileSystemId
  });

  // ✅ Send updated user count
  const remainingUsers = fileSystemRoomUsers[fileSystemId].length;
  io.to(`filesystem:${fileSystemId}`).emit('user-count', remainingUsers);

  // Clean up empty rooms
  if (remainingUsers === 0) {
    delete fileSystemRoomUsers[fileSystemId];
  }

  console.log(`✅ User ${socket.userId} left filesystem item ${fileSystemId}. Remaining users: ${remainingUsers}`);
}

// ✅ Export room users for debugging
export { fileSystemRoomUsers };