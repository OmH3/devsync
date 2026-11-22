import { createSecretKey } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/app.config.js";

const COOKIE_NAME = "session";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SECRET_KEY = createSecretKey(Buffer.from(config.SESSION_SECRET, "utf8"));

export const createSessionPayload = (user) => ({
  _id: user._id?.toString?.() ?? user._id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  currentWorkspace: user.currentWorkspace?._id?.toString?.() ?? user.currentWorkspace?.toString?.() ?? null,
});

export const signSessionToken = (user) =>
  jwt.sign(createSessionPayload(user), SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: config.SESSION_EXPIRES_IN || "1d",
  });

export const verifySessionToken = (token) =>
  jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });

export const setSessionCookie = (res, user) => {
  const token = signSessionToken(user);
  res.cookie(COOKIE_NAME, token, {
    maxAge: MAX_AGE_MS,
    secure: true,
    httpOnly: true,
    sameSite: "none",
    path: "/",
  });
  return token;
};

export const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
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
