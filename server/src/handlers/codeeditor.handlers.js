//Global room users tracking for code editors (matching docs pattern)
const codeEditorRoomUsers = {};

//Helper function to handle joining code editor
function handleJoinCodeEditor(socket, io, codeEditorId) {
  try {

    if (!socket.userId || !codeEditorId) {
      socket.emit('error', { message: 'Missing userId or codeEditorId' });
      return;
    }

    // Join the room
    socket.join(`code-editor:${codeEditorId}`);
    socket.currentCodeEditorId = codeEditorId;

    //Track users in room (matching docs pattern)
    if (!codeEditorRoomUsers[codeEditorId]) {
      codeEditorRoomUsers[codeEditorId] = [];
    }

    // Remove user if already in room (reconnection scenario)
    codeEditorRoomUsers[codeEditorId] = codeEditorRoomUsers[codeEditorId].filter(
      user => user.userId !== socket.userId
    );

    // Add user to room
    const userInfo = {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6',
      socketId: socket.id,
      joinedAt: new Date()
    };
    codeEditorRoomUsers[codeEditorId].push(userInfo);

    //Notify user they successfully joined
    socket.emit('code-editor-joined', {
      codeEditorId,
      userCount: codeEditorRoomUsers[codeEditorId].length,
      users: codeEditorRoomUsers[codeEditorId]
    });

    //Notify other users in the room
    socket.to(`code-editor:${codeEditorId}`).emit('user-joined-code-editor', {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6',
      codeEditorId
    });

    //Send updated user count to all users
    io.to(`code-editor:${codeEditorId}`).emit('user-count', codeEditorRoomUsers[codeEditorId].length);

  } catch (error) {

    socket.emit('error', { message: 'Failed to join code editor' });
  }
}

//Helper function to handle leaving code editor
function handleLeaveCodeEditor(socket, io, codeEditorId) {
  if (!codeEditorId || !codeEditorRoomUsers[codeEditorId]) return;

  // Remove user from room tracking
  codeEditorRoomUsers[codeEditorId] = codeEditorRoomUsers[codeEditorId].filter(
    user => user.userId !== socket.userId
  );

  // Leave the socket room
  socket.leave(`code-editor:${codeEditorId}`);
  socket.currentCodeEditorId = null;

  //Notify other users
  socket.to(`code-editor:${codeEditorId}`).emit('user-left-code-editor', {
    socketId: socket.id,
      userId: socket.userId,
    userName: socket.userName || socket.userEmail,
    codeEditorId
  });

  //Send updated user count
  const remainingUsers = codeEditorRoomUsers[codeEditorId].length;
  io.to(`code-editor:${codeEditorId}`).emit('user-count', remainingUsers);

  // Clean up empty rooms
  if (remainingUsers === 0) {
    delete codeEditorRoomUsers[codeEditorId];
  }

}

//Handle real-time code changes (FIXED - matching frontend event names)
function handleCodeEditorChange(socket, io, data) {
  const { codeEditorId, title, content, language, timestamp } = data;
  
  if (!socket.userId || !codeEditorId) {
    socket.emit('error', { message: 'Unauthorized or missing data' });
    return;
  }

  //Broadcast to all users in the code editor room (except sender)
  //FIXED: Event name matches frontend listener 'code-editor-changed'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-changed', {
    codeEditorId,
    title,
    content,
    language,
    timestamp,
    socketId: socket.id,
      userId: socket.userId,
    userName: socket.userName || socket.userEmail
  });
}

//Handle cursor position updates
function handleCodeEditorCursor(socket, io, data) {
  const { codeEditorId, position, selection } = data;
  
  if (!socket.userId || !codeEditorId) return;

  //Broadcast cursor position to other users
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-cursor-move', {
    codeEditorId,
    position,
    selection,
    user: {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail,
      userColor: socket.userColor || '#3B82F6'
    },
    timestamp: Date.now()
  });
}

//Handle code execution notifications (FIXED - matching frontend)
function handleCodeEditorExecution(socket, io, data) {
  const { codeEditorId, result, error, executionTime, language, input } = data;
  
  if (!socket.userId || !codeEditorId) {
    socket.emit('error', { message: 'Unauthorized or missing data' });
    return;
  }

  //Broadcast execution results to other users
  //FIXED: Event name matches frontend listener 'code-editor-execution-result'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-execution-result', {
    codeEditorId,
    result,
    error,
    executionTime,
    language,
    input,
    executedBy: {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: Date.now()
  });
}

//Handle auto-save notifications (FIXED - matching controller events)
function handleCodeEditorAutoSave(socket, io, data) {
  const { codeEditorId, title, content, language } = data;
  
  if (!socket.userId || !codeEditorId) return;

  //Broadcast auto-save to other users
  //FIXED: Event name matches frontend listener 'code-editor-content-saved'
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-content-saved', {
    codeEditorId,
    content: {
      title,
      content,
      language
    },
    savedBy: {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: new Date()
  });
}

//Handle manual save notifications (FIXED - matching frontend)
function handleCodeEditorSave(socket, io, data) {
  const { codeEditorId, title, content, language } = data;
  
  if (!socket.userId || !codeEditorId) return;

  //Broadcast manual save to other users
  //FIXED: Different event name for manual vs auto save
  socket.to(`code-editor:${codeEditorId}`).emit('code-editor-saved', {
    codeEditorId,
    title,
    content,
    language,
    savedBy: {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName || socket.userEmail
    },
    timestamp: new Date()
  });
}

//Main setup function - MATCHES both controller and frontend exactly
export const setupCodeEditorHandlers = (socket, io) => {

  //Join code editor room
  socket.on('join-code-editor', (codeEditorId) => {

    handleJoinCodeEditor(socket, io, codeEditorId);
  });

  //Leave code editor room
  socket.on('leave-code-editor', (codeEditorId) => {

    handleLeaveCodeEditor(socket, io, codeEditorId);
  });

  //Handle real-time code changes (FIXED - matches frontend emit)
  socket.on('code-editor-change', (data) => {

    handleCodeEditorChange(socket, io, data);
  });

  //Handle cursor movements (FIXED - matches frontend emit)
  socket.on('code-editor-cursor', (data) => {
    // Don't log every cursor movement to avoid spam
    handleCodeEditorCursor(socket, io, data);
  });

  //Handle code execution results (FIXED - matches frontend emit)
  socket.on('code-editor-execution', (data) => {

    handleCodeEditorExecution(socket, io, data);
  });

  //Handle auto-save notifications (FIXED - matches frontend emit)
  socket.on('code-editor-auto-save', (data) => {

    handleCodeEditorAutoSave(socket, io, data);
  });

  //Handle manual save notifications (FIXED - matches frontend emit)
  socket.on('code-editor-save', (data) => {

    handleCodeEditorSave(socket, io, data);
  });

  //Handle disconnect - clean up when user disconnects
  socket.on('disconnect', () => {

    if (socket.currentCodeEditorId) {
      handleLeaveCodeEditor(socket, io, socket.currentCodeEditorId);
    }
  });

};

//Export room users for debugging
export { codeEditorRoomUsers };