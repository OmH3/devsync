import { io } from 'socket.io-client';
import { API_ORIGIN } from '../config/env.js';

// One Socket.IO connection per browser tab, shared by every useSocket() caller.
const CLOSE_DELAY_MS = 250; // survives React StrictMode's mount/unmount/mount cycle

let socket = null;
let consumers = 0;
let closeTimer = null;
const workspaceRooms = new Map(); // workspaceId -> number of components that joined it

const workspaceIdOf = (payload) => (typeof payload === 'object' && payload !== null ? payload.workspaceId : payload);

// Several components join/leave the same workspace room. Reference-count the events so one
// component unmounting does not remove the others from the room.
function installWorkspaceRefCounting(instance) {
  const rawEmit = instance.emit.bind(instance);
  instance.on('workspace-joined', (data) => {
    const id = workspaceIdOf(data);
    if (id && workspaceRooms.has(id)) {
      workspaceRooms.get(id).lastJoinedPayload = data;
    }
  });
  instance.emit = (event, ...args) => {
    if (event !== 'join-workspace' && event !== 'leave-workspace') return rawEmit(event, ...args);

    const id = workspaceIdOf(args[0]);
    const entry = workspaceRooms.get(id) ?? { count: 0, lastJoinedPayload: { workspaceId: id, userCount: 1 } };
    if (event === 'join-workspace') {
      entry.count += 1;
      workspaceRooms.set(id, entry);
      if (entry.count === 1) return rawEmit(event, ...args);
      // Already in the room: synthesize the local ack so the new subscriber updates its state
      queueMicrotask(() => {
        instance.listeners('workspace-joined').forEach((fn) => fn(entry.lastJoinedPayload));
      });
      return instance;
    }
    if (entry.count <= 1) {
      workspaceRooms.delete(id);
      return rawEmit(event, ...args);
    }
    entry.count -= 1;
    return instance;
  };
  // After a reconnect the server has forgotten our rooms; restore them.
  instance.on('connect', () => {
    workspaceRooms.forEach((_entry, id) => rawEmit('join-workspace', { workspaceId: id }));
  });
}

export function acquireSocket() {
  clearTimeout(closeTimer);
  consumers += 1;
  if (!socket) {
    socket = io(API_ORIGIN || undefined, { withCredentials: true });
    installWorkspaceRefCounting(socket);
  }
  return socket;
}

export function releaseSocket() {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0) return;
  closeTimer = setTimeout(() => {
    if (consumers === 0 && socket) {
      socket.close();
      socket = null;
      workspaceRooms.clear();
    }
  }, CLOSE_DELAY_MS);
}
