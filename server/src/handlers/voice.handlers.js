import Member from '../models/Member.model.js';

// Small workspace voice rooms: audio travels peer-to-peer; Node relays signaling only.
export function setupVoiceHandlers(socket, io, members = Member) {
  const leave = () => {
    const room = socket.voiceRoom;
    if (!room) return;
    socket.leave(room);
    socket.to(room).emit('voice:left', { id: socket.id });
    socket.voiceRoom = null;
  };
  socket.on('voice:join', async ({ workspaceId } = {}, ack = () => {}) => {
    try {
      if (!/^[a-f0-9]{24}$/i.test(workspaceId || '')) return ack({ error: 'Invalid workspace' });
      if (!await members.exists({ userId: socket.userId, workspaceId })) return ack({ error: 'Workspace access denied' });
      const room = `voice:${workspaceId}`;
      const ids = [...(io.sockets.adapter.rooms.get(room) || [])].filter(id => id !== socket.id);
      if (ids.length >= 8) return ack({ error: 'This room is full (8 people).' });
      leave();
      await socket.join(room);
      socket.voiceRoom = room;
      const peers = ids.map(id => ({ id, name: io.sockets.sockets.get(id)?.userName || 'Teammate' }));
      ack({ peers });
      socket.to(room).emit('voice:joined', { id: socket.id, name: socket.userName || 'Teammate' });
    } catch { ack({ error: 'Could not join the audio room' }); }
  });
  socket.on('voice:signal', async ({ to, description, candidate } = {}) => {
    try {
      const room = socket.voiceRoom;
      const peer = io.sockets.sockets.get(to);
      if (!room || peer?.voiceRoom !== room) return;
      const workspaceId = room.slice(6);
      const memberCount = await members.countDocuments({ workspaceId, userId: { $in: [socket.userId, peer.userId] } });
      if (memberCount < (String(socket.userId) === String(peer.userId) ? 1 : 2)) return leave();
      if (description && (!['offer','answer'].includes(description.type) || typeof description.sdp !== 'string' || description.sdp.length > 65536 || /m=video/.test(description.sdp))) return;
      if (candidate && JSON.stringify(candidate).length > 8192) return;
      peer.emit('voice:signal', { from: socket.id, description, candidate });
    } catch { /* Invalid signaling packets are discarded. */ }
  });
  socket.on('voice:leave', leave);
  socket.on('disconnect', leave);
}
