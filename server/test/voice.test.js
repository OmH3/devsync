import test from 'node:test';
import assert from 'node:assert/strict';
import { setupVoiceHandlers } from '../src/handlers/voice.handlers.js';
const workspaceId = 'a'.repeat(24);
function harness(allowed) {
  const handlers = {}, messages = [];
  const peer = { userId: 'other', voiceRoom: `voice:${workspaceId}`, emit: (...args) => messages.push(args) };
  const socket = { id: 'self', userId: 'user', on: (event, fn) => { handlers[event] = fn; }, join: async () => {}, leave: () => {}, to: () => ({ emit: () => {} }) };
  const io = { sockets: { adapter: { rooms: new Map() }, sockets: new Map([['peer', peer]]) } };
  setupVoiceHandlers(socket, io, { exists: async () => allowed, countDocuments: async () => allowed ? 2 : 0 });
  return { socket, handlers, messages };
}
test('voice rooms deny workspace outsiders and accept members', async () => {
  for (const allowed of [false, true]) {
    const { socket, handlers } = harness(allowed); let response;
    await handlers['voice:join']({ workspaceId }, data => { response = data; });
    assert.equal(Boolean(response.error), !allowed);
    assert.equal(Boolean(socket.voiceRoom), allowed);
  }
});
test('voice signaling rejects video and relays audio only within the room', async () => {
  const { socket, handlers, messages } = harness(true); socket.voiceRoom = `voice:${workspaceId}`;
  await handlers['voice:signal']({ to: 'peer', description: { type: 'offer', sdp: 'm=video 9 UDP/TLS/RTP/SAVPF 96' } });
  assert.equal(messages.length, 0);
  await handlers['voice:signal']({ to: 'peer', description: { type: 'offer', sdp: 'm=audio 9 UDP/TLS/RTP/SAVPF 111' } });
  assert.equal(messages.length, 1);
  socket.voiceRoom = 'voice:other';
  await handlers['voice:signal']({ to: 'peer', candidate: { candidate: 'candidate' } });
  assert.equal(messages.length, 1);
});
test('leaving clears room membership', () => {
  const { socket, handlers } = harness(true); socket.voiceRoom = `voice:${workspaceId}`;
  handlers['voice:leave'](); assert.equal(socket.voiceRoom, null);
});
