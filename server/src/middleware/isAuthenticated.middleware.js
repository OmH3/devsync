import { UnauthorizedException } from "../utils/app-error.js";
import { extractTokenFromHeader, verifySessionToken } from "../utils/jwt.js";

const isAuthenticated = async (req, res, next) => {
  const token = extractTokenFromHeader(req.headers.cookie, req.headers.authorization);
  if (!token) {
    throw new UnauthorizedException("Unauthorized. Please login");
  }
  try {
    const user = await verifySessionToken(token);
    if (!user || !user._id) {
      throw new UnauthorizedException("Unauthorized. Please login");
    }
    req.user = user;
    next();
  } catch {
    throw new UnauthorizedException("Unauthorized. Please login");
  }
};

export const authenticateSocket = async (socket, next) => {
  try {
    const token = extractTokenFromHeader(
      socket.handshake?.headers?.cookie || socket.request?.headers?.cookie,
      socket.handshake?.headers?.authorization || socket.request?.headers?.authorization
    );
    if (!token) {
      return next(new Error("Authentication failed"));
    }

    const user = await verifySessionToken(token);
    if (!user || !user._id) {
      return next(new Error("Authentication failed"));
    }

    socket.sessionId = user.sessionId;
    socket.sessionExpiresAt = user.sessionExpiresAt;
    socket.sessionToken = token;
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userName = user.name;
    socket.currentWorkspace = user.currentWorkspace?.toString();

    next();
  } catch (error) {
    return next(new Error("Authentication failed"));
  }
};

export default isAuthenticated;
