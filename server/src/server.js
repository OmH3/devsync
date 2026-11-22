import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import "dotenv/config";
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
import healthRoutes from './routes/health.routes.js';

// --- Controller Imports for Socket.IO ---
import { setSocketIO as setWhiteboardSocketIO } from "./controllers/whiteboard.controller.js";
import { setSocketIO as setDocsSocketIO } from "./controllers/docs.controllers.js";
import { setSocketIO as setCodeEditorSocketIO } from "./controllers/codeeditor.controller.js";
import { setSocketIO as setFileSystemSocketIO } from "./controllers/filesystem.controller.js";
import { setSocketIO as setAudioRoomSocketIO } from "./controllers/audioroom.controller.js";

// --- App and Server Initialization ---
const app = express();

//CRITICAL: Trust proxy for Render.com
app.set("trust proxy", 1);

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
console.log(`Base API Path: ${BASE_PATH}`);
// --- Global Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization","Cookie"],
    exposedHeaders: ["Set-Cookie"], //Add this
  })
);

app.use(passport.initialize());

// --- Socket.IO Integration ---
// Initialize Socket.IO handlers and pass the instance to controllers.
setupSocketIO(io);
setWhiteboardSocketIO(io);
setDocsSocketIO(io);
setCodeEditorSocketIO(io);
setFileSystemSocketIO(io);
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
app.use(`${BASE_PATH}/audioroom`, isAuthenticated, audioRoomRoutes);

// --- Error Handling Middleware ---
// The error handler must be the last middleware in the stack.
app.use(errorHandler);

// --- Server Start and Database Connection ---
server.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});