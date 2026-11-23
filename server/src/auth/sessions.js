import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import { config } from '../config/app.config.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const cache = new Map();
let generation = 0;
export const sessionEvents = new EventEmitter();

export async function createSession(userId) {
  const sid = randomBytes(32).toString('hex');
  await Session.create({ sidHash: hash(sid), userId, expiresAt: new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000) });
  return sid;
}

export async function resolveSession(sid, userId) {
  if (typeof sid !== 'string' || typeof userId !== 'string') throw new Error('Invalid session');
  const key = hash(sid);
  const existing = cache.get(key);
  if (existing && existing.until > Date.now() && existing.user._id.toString() === userId) return existing.user;
  const observedGeneration = generation;
  const session = await Session.findOne({ sidHash: key, userId, revoked: false, expiresAt: { $gt: new Date() } }).lean();
  if (!session) throw new Error('Session is expired or revoked');
  const user = await User.findOne({ _id: userId, isActive: true }).select('name email profilePicture currentWorkspace').lean();
  if (!user || observedGeneration !== generation) throw new Error('Session changed; retry authentication');
  if (cache.size >= 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { user, until: Math.min(Date.now() + config.AUTH_CACHE_TTL_MS, session.expiresAt.getTime()) });
  return user;
}

export async function revokeSession(sid) {
  if (typeof sid !== 'string') return;
  const key = hash(sid);
  await Session.updateOne({ sidHash: key }, { $set: { revoked: true } });
  generation++;
  cache.delete(key);
  sessionEvents.emit('revoked', sid);
}
