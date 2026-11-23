import { createSecretKey } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from '../config/app.config.js';
import { createSession, resolveSession, revokeSession } from '../auth/sessions.js';

const COOKIE_NAME = "session";
const MAX_AGE_MS = config.SESSION_TTL_SECONDS * 1000;
const SECRET_KEY = createSecretKey(Buffer.from(config.SESSION_SECRET, "utf8"));

export const createSessionPayload = (user) => ({
  _id: user._id?.toString?.() ?? user._id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  currentWorkspace: user.currentWorkspace?._id?.toString?.() ?? user.currentWorkspace?.toString?.() ?? null,
});

export const signSessionToken = async (user) => {
  const sid = await createSession(user._id);
  return jwt.sign({ sid }, SECRET_KEY, {
    subject: user._id.toString(), algorithm: 'HS256',
    issuer: 'devsync', audience: 'devsync-web', expiresIn: config.SESSION_TTL_SECONDS,
  });
};

const verifyClaims = token => jwt.verify(token, SECRET_KEY, {
  algorithms: ['HS256'], issuer: 'devsync', audience: 'devsync-web',
});

export const verifySessionToken = async token => {
  const claims = verifyClaims(token);
  const user = await resolveSession(claims.sid, claims.sub);
  return { ...user, sessionId: claims.sid, sessionExpiresAt: claims.exp * 1000 };
};

export const revokeSessionToken = async token => {
  if (!token) return;
  let claims;
  try { claims = verifyClaims(token); } catch { return; }
  await revokeSession(claims.sid);
};
export const setSessionCookie = async (res, user) => {
  const token = await signSessionToken(user);
  res.cookie(COOKIE_NAME, token, {
    maxAge: MAX_AGE_MS,
    secure: config.COOKIE_SECURE,
    httpOnly: true,
    sameSite: config.COOKIE_SAME_SITE,
    path: "/",
  });
  return token;
};

export const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: "/",
  });
};

export const extractTokenFromHeader = (cookieHeader, authHeader) => {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === COOKIE_NAME) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
};
