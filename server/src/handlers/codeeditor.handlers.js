// ✅ Global room users tracking for code editors (matching docs pattern)
const codeEditorRoomUsers = {};

// ✅ Helper function to handle joining code editor
function handleJoinCodeEditor(socket, io, codeEditorId) {
  try {
    console.log(`👤 User ${socket.userId} joining code editor: ${codeEditorId}`);
    
    if (!socket.userId || !codeEditorId) {
      socket.emit('error', { message: 'Missing userId or codeEditorId' });
      return;
    }

    // Join the room
    socket.join(`code-editor:${codeEditorId}`);
    socket.currentCodeEditorId = codeEditorId;

    // ✅ Track users in room (matching docs pattern)
    if (!codeEditorRoomUsers[codeEditorId]) {
      codeEditorRoomUsers[codeEditorId] = [];
    }

    // Remove user if already in room (reconnection scenario)
    codeEditorRoomUsers[codeEditorId] = codeEditorRoomUsers[codeEditorId].filter(
      user => user.userId !== socket.userId
    );

    // Add user to room
    const userInfo = {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6',
      socketId: socket.id,
      joinedAt: new Date()
    };
    codeEditorRoomUsers[codeEditorId].push(userInfo);

    // ✅ Notify user they successfully joined
    socket.emit('code-editor-joined', {
      codeEditorId,
      userCount: codeEditorRoomUsers[codeEditorId].length,
      users: codeEditorRoomUsers[codeEditorId]
    });

    // ✅ Notify other users in the room
    socket.to(`code-editor:${codeEditorId}`).emit('user-joined-code-editor', {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6',
      codeEditorId
    });

    // ✅ Send updated user count to all users
    io.to(`code-editor:${codeEditorId}`).emit('user-count', codeEditorRoomUsers[codeEditorId].length);

    console.log(`✅ User ${socket.userId} joined code editor ${codeEditorId}. Total users: ${codeEditorRoomUsers[codeEditorId].length}`);

  } catch (error) {
    console.error('❌ Error joining code editor:', error);
    socket.emit('error', { message: 'Failed to join code editor' });
  }
}

// ✅ Helper function to handle leaving code editor
function handleLeaveCodeEditor(socket, io, codeEditorId) {
  if (!codeEditorId || !codeEditorRoomUsers[codeEditorId]) return;

  console.log(`👋 User ${socket.userId} leaving code editor: ${codeEditorId}`);

  // Remove user from room tracking
  codeEditorRoomUsers[codeEditorId] = codeEditorRoomUsers[codeEditorId].filter(
    user => user.userId !== socket.userId
  );

  // Leave the socket room
  socket.leave(`code-editor:${codeEditorId}`);
  socket.currentCodeEditorId = null;

  // ✅ Notify other users
  socket.to(`code-editor:${codeEditorId}`).emit('user-left-code-editor', {
    userId: socket.userId,
    userName: socket.userName || socket.userEmail,
    codeEditorId
  });

  // ✅ Send updated user count
  const remainingUsers = codeEditorRoomUsers[codeEditorId].length;
  io.to(`code-editor:${codeEditorId}`).emit('user-count', remainingUsers);

  // Clean up empty rooms
  if (remainingUsers === 0) {
    delete codeEditorRoomUsers[codeEditorId];
  }

  console.log(`✅ User ${socket.userId} left code editor ${codeEditorId}. Remaining users: ${remainingUsers}`);
}

// ✅ Handle real-time code changes (FIXED - matching frontend event names)
function handleCodeEditorChange(socket, io, data) {
  const { codeEditorId, title, content, language, timestamp } = data;
  
  if (!socket.userId || !codeEditorId) {
    socket.emit('error', { message: 'Unauthorized or missing data' });
    return;
  }

  console.log(`🔄 Broadcasting code editor live change for room: code-editor:${codeEditorId}`);
  
  // ✅ Broadcast to all users in the code editor room (except sender)
  // ✅ FIXED: Event name matches frontend listener 'code-editor-changed'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-changed', {
    codeEditorId,
    title,
    content,
    language,
    timestamp,
    userId: socket.userId,
    userName: socket.userName || socket.userEmail
  });
}

// ✅ Handle cursor position updates
function handleCodeEditorCursor(socket, io, data) {
  const { codeEditorId, position, selection } = data;
  
  if (!socket.userId || !codeEditorId) return;

  console.log(`👆 Cursor movement from user ${socket.userId} in code editor ${codeEditorId}`);

  // ✅ Broadcast cursor position to other users
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-cursor-move', {
    codeEditorId,
    position,
    selection,
    user: {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6'
    },
    timestamp: Date.now()
  });
}

// ✅ Handle code execution notifications (FIXED - matching frontend)
function handleCodeEditorExecution(socket, io, data) {
  const { codeEditorId, result, error, executionTime, language, input } = data;
  
  if (!socket.userId || !codeEditorId) {
    socket.emit('error', { message: 'Unauthorized or missing data' });
    return;
  }

  console.log(`▶️ Code execution result from ${socket.userId} in code editor ${codeEditorId}`);

  // ✅ Broadcast execution results to other users
  // ✅ FIXED: Event name matches frontend listener 'code-editor-execution-result'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-execution-result', {
    codeEditorId,
    result,
    error,
    executionTime,
    language,
    input,
    executedBy: {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: Date.now()
  });
}

// ✅ Handle auto-save notifications (FIXED - matching controller events)
function handleCodeEditorAutoSave(socket, io, data) {
  const { codeEditorId, title, content, language } = data;
  
  if (!socket.userId || !codeEditorId) return;

  console.log(`💾 Auto-save notification from user ${socket.userId} for code editor ${codeEditorId}`);

  // ✅ Broadcast auto-save to other users
  // ✅ FIXED: Event name matches frontend listener 'code-editor-content-saved'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-content-saved', {
    codeEditorId,
    content: {
      title,
      content,
      language
    },
    savedBy: {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: new Date()
  });
}

// ✅ Handle manual save notifications (FIXED - matching frontend)
function handleCodeEditorSave(socket, io, data) {
  const { codeEditorId, title, content, language } = data;
  
  if (!socket.userId || !codeEditorId) return;

  console.log(`💾 Manual save from user ${socket.userId} for code editor ${codeEditorId}`);

  // ✅ Broadcast manual save to other users
  // ✅ FIXED: Different event name for manual vs auto save
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-saved', {
    codeEditorId,
    title,
    content,
    language,
    savedBy: {
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: new Date()
  });
}

// ✅ Main setup function - MATCHES both controller and frontend exactly
export const setupCodeEditorHandlers = (socket, io) => {
  console.log('🔌 Setting up code editor handlers for user:', socket.userId);

  // ✅ Join code editor room
  socket.on('join-code-editor', (codeEditorId) => {
    console.log(`📥 Received join-code-editor event from ${socket.userId} for editor: ${codeEditorId}`);
    handleJoinCodeEditor(socket, io, codeEditorId);
  });

  // ✅ Leave code editor room
  socket.on('leave-code-editor', (codeEditorId) => {
    console.log(`📤 Received leave-code-editor event from ${socket.userId} for editor: ${codeEditorId}`);
    handleLeaveCodeEditor(socket, io, codeEditorId);
  });

  // ✅ Handle real-time code changes (FIXED - matches frontend emit)
  socket.on('code-editor-change', (data) => {
    console.log(`📝 Received code-editor-change from user ${socket.userId}:`, {
      codeEditorId: data.codeEditorId,
      titleLength: data.title?.length || 0,
      contentLength: data.content?.length || 0,
      language: data.language
    });
    handleCodeEditorChange(socket, io, data);
  });

  // ✅ Handle cursor movements (FIXED - matches frontend emit)
  socket.on('code-editor-cursor', (data) => {
    // Don't log every cursor movement to avoid spam
    handleCodeEditorCursor(socket, io, data);
  });

  // ✅ Handle code execution results (FIXED - matches frontend emit)
  socket.on('code-editor-execution', (data) => {
    console.log(`▶️ Received code-editor-execution from user ${socket.userId} for editor: ${data.codeEditorId}`);
    handleCodeEditorExecution(socket, io, data);
  });

  // ✅ Handle auto-save notifications (FIXED - matches frontend emit)
  socket.on('code-editor-auto-save', (data) => {
    console.log(`💾 Received code-editor-auto-save from user ${socket.userId} for editor: ${data.codeEditorId}`);
    handleCodeEditorAutoSave(socket, io, data);
  });

  // ✅ Handle manual save notifications (FIXED - matches frontend emit)
  socket.on('code-editor-save', (data) => {
    console.log(`💾 Received code-editor-save from user ${socket.userId} for editor: ${data.codeEditorId}`);
    handleCodeEditorSave(socket, io, data);
  });

  // ✅ Handle disconnect - clean up when user disconnects
  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.userId} disconnected from code editor`);
    if (socket.currentCodeEditorId) {
      handleLeaveCodeEditor(socket, io, socket.currentCodeEditorId);
    }
  });

  console.log('✅ Code editor handlers setup complete for user:', socket.userId);
};

// ✅ Export room users for debugging
export { codeEditorRoomUsers };