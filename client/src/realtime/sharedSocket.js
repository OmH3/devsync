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
  instance.emit = (event, ...args) => {
    if (event !== 'join-workspace' && event !== 'leave-workspace') return rawEmit(event, ...args);

    const id = workspaceIdOf(args[0]);
    const count = workspaceRooms.get(id) ?? 0;
    if (event === 'join-workspace') {
      workspaceRooms.set(id, count + 1);
      return count === 0 ? rawEmit(event, ...args) : instance;
    }
    if (count <= 1) {
      workspaceRooms.delete(id);
      return rawEmit(event, ...args);
    }
    workspaceRooms.set(id, count - 1);
    return instance;
  };
  // After a reconnect the server has forgotten our rooms; restore them.
  instance.on('connect', () => {
    workspaceRooms.forEach((_count, id) => rawEmit('join-workspace', { workspaceId: id }));
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
