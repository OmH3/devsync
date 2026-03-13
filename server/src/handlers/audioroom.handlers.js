//FIX: Remove the third parameter that's not being used consistently
export const setupAudioRoomHandlers = (socket, io) => {
  console.log(' Setting up audio room handlers for user:', socket.userId);

  //Join workspace room for audio room events
  socket.on('join-workspace', (data) => {
    const { workspaceId } = data;
    if (workspaceId) {
      socket.join(`workspace:${workspaceId}`);
      console.log(` User ${socket.userId} joined workspace room: workspace:${workspaceId}`);
    }
  });

  //Leave workspace room
  socket.on('leave-workspace', (data) => {
    const { workspaceId } = data;
    if (workspaceId) {
      socket.leave(`workspace:${workspaceId}`);
      console.log(` User ${socket.userId} left workspace room: workspace:${workspaceId}`);
    }
  });

  //Join audio room socket
  socket.on('join-audio-room-socket', (data) => {
    const { audioRoomId, workspaceId } = data;
    console.log(' User joining audio room socket:', { audioRoomId, workspaceId, userId: socket.userId });
    
    socket.join(`audio-room:${audioRoomId}`);
    if (workspaceId) {
      socket.join(`workspace:${workspaceId}`);
    }
  });

  //Leave audio room socket
  socket.on('leave-audio-room-socket', (data) => {
    const { audioRoomId } = data;
    console.log(' User leaving audio room socket:', { audioRoomId, userId: socket.userId });
    
    socket.leave(`audio-room:${audioRoomId}`);
  });

  //Audio room mute toggle
  socket.on('audio-room-mute-toggle', (data) => {
    const { audioRoomId, isMuted } = data;
    console.log(' Audio room mute toggle:', { audioRoomId, userId: socket.userId, isMuted });
    
    socket.to(`audio-room:${audioRoomId}`).emit('participant-mute-toggled', {
      userId: socket.userId,
      isMuted,
      timestamp: new Date()
    });
  });

  //Speaking status
  socket.on('audio-room-speaking', (data) => {
    const { audioRoomId, isSpeaking } = data;
    
    socket.to(`audio-room:${audioRoomId}`).emit('participant-speaking', {
      userId: socket.userId,
      isSpeaking,
      timestamp: new Date()
    });
  });
};