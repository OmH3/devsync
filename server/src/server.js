import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import "dotenv/config";
import session from "express-session";
import MongoStore from 'connect-mongo';
import passport from "passport";
import cors from "cors";

// --- Configuration and Database Connection ---
import { config } from "./config/app.config.js";
import "./config/passport.config.js";
import connectDatabase from "./config/database.config.js";
import { setupSocketIO } from "./config/socket.config.js";

// --- Middleware ---
import { errorHandler } from "./middleware/error-handler.middleware.js";
import isAuthenticated from "./middleware/isAuthenticated.middleware.js";

// --- Route Imports ---
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import memberRoutes from "./routes/member.routes.js";
import docsRoutes from "./routes/docs.routes.js";
import filesystemRoutes from "./routes/filesystem.routes.js";
import codeeditorRoutes from "./routes/codeeditor.routes.js";
import whiteboardRoutes from "./routes/whiteboard.routes.js";
import audioRoomRoutes from "./routes/audioroom.routes.js";
import streamRoutes from "./routes/stream.routes.js";
import healthRoutes from './routes/health.routes.js';

// --- Controller Imports for Socket.IO ---
import { setSocketIO as setWhiteboardSocketIO } from "./controllers/whiteboard.controller.js";
import { setSocketIO as setDocsSocketIO } from "./controllers/docs.controllers.js";
import { setSocketIO as setCodeEditorSocketIO } from "./controllers/codeeditor.controller.js";
import { setSocketIO as setFileSystemSocketIO } from "./controllers/filesystem.controller.js";
import { setSocketIO as setStreamSocketIO } from "./controllers/stream.controller.js";
import { setSocketIO as setAudioRoomSocketIO } from "./controllers/audioroom.controller.js";

// --- App and Server Initialization ---
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});
const BASE_PATH = config.BASE_PATH;

// --- Global Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --- Session and Passport Configuration ---
const sessionMiddleware = session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "session",
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60, // 7 days
    autoRemove: 'native',
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    path: "/",
  },
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// --- Socket.IO Integration ---
// This middleware allows Socket.IO to share the same session as Express.
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Initialize Socket.IO handlers and pass the instance to controllers.
setupSocketIO(io);
setWhiteboardSocketIO(io);
setDocsSocketIO(io);
setCodeEditorSocketIO(io);
setFileSystemSocketIO(io);
setStreamSocketIO(io);
setAudioRoomSocketIO(io);

// --- Routes ---
// Health check route
app.use(`${BASE_PATH}/`, healthRoutes);

// Auth routes don't require authentication middleware
app.use(`${BASE_PATH}/auth`, authRoutes);

// All other routes require authentication
app.use(`${BASE_PATH}/user`, isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);
app.use(`${BASE_PATH}/member`, isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/docs`, isAuthenticated, docsRoutes);
app.use(`${BASE_PATH}/filesystem`, isAuthenticated, filesystemRoutes);
app.use(`${BASE_PATH}/codeeditor`, isAuthenticated, codeeditorRoutes);
app.use(`${BASE_PATH}/whiteboard`, isAuthenticated, whiteboardRoutes);
app.use(`${BASE_PATH}/stream`, isAuthenticated, streamRoutes);
app.use(`${BASE_PATH}/audioroom`, isAuthenticated, audioRoomRoutes);

// --- Error Handling Middleware ---
// The error handler must be the last middleware in the stack.
app.use(errorHandler);

// --- Server Start and Database Connection ---
server.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});