import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import "dotenv/config";
import passport from "passport";
import cors from "cors";
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { createLogger, safeSerializers } from './observability/logger.js';

// --- Configuration and Database Connection ---
import { config } from "./config/app.config.js";
import { configurePassport } from "./config/passport.config.js";

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

import healthRoutes from './routes/health.routes.js';

// --- Controller Imports for Socket.IO ---
import { setSocketIO as setWhiteboardSocketIO } from "./controllers/whiteboard.controller.js";
import { setSocketIO as setDocsSocketIO } from "./controllers/docs.controllers.js";
import { setSocketIO as setCodeEditorSocketIO } from "./controllers/codeeditor.controller.js";
import { setSocketIO as setFileSystemSocketIO } from "./controllers/filesystem.controller.js";


// --- App and Server Initialization ---
export function createApplication() {
configurePassport();
const app = express();
const logger = createLogger(config);
app.locals.logger = logger;
app.use(pinoHttp({ logger, genReqId: () => randomUUID(), serializers: safeSerializers, wrapSerializers: false }));
app.use((req, res, next) => { res.setHeader('X-Request-Id', req.id); next(); });
app.use(helmet());
app.disable('x-powered-by');

//CRITICAL: Trust proxy for Render.com
app.set("trust proxy", config.TRUST_PROXY_HOPS);

const server = createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: config.SOCKET_MAX_PAYLOAD_BYTES,
  cors: {
    origin: config.FRONTEND_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});
const BASE_PATH = config.BASE_PATH;
console.log(`Base API Path: ${BASE_PATH}`);
// --- Global Middleware Setup ---
app.use(express.json({ limit: config.HTTP_BODY_LIMIT_BYTES }));
app.use(express.urlencoded({ extended: false, limit: config.HTTP_BODY_LIMIT_BYTES }));
app.use(
  cors({
    origin: config.FRONTEND_ORIGINS,
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


// --- Routes ---
// Health check route
app.use(`${BASE_PATH}/`, healthRoutes);

// Auth routes don't require authentication middleware
app.use(`${BASE_PATH}/auth`, authRoutes);
app.get(`${BASE_PATH}/capabilities`, (req, res) => res.json({
  audio: config.AUDIO_ENABLED,
  googleAuth: config.GOOGLE_AUTH_ENABLED,
  codeExecution: config.CODE_EXECUTION_ENABLED,
}));

// All other routes require authentication
app.use(`${BASE_PATH}/user`, isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);
app.use(`${BASE_PATH}/member`, isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/docs`, isAuthenticated, docsRoutes);
app.use(`${BASE_PATH}/filesystem`, isAuthenticated, filesystemRoutes);
app.use(`${BASE_PATH}/codeeditor`, isAuthenticated, codeeditorRoutes);
app.use(`${BASE_PATH}/whiteboard`, isAuthenticated, whiteboardRoutes);


// --- Error Handling Middleware ---
// The error handler must be the last middleware in the stack.
app.use((req, res) => res.status(404).json({ message: 'Resource not found', error: { code: 'NOT_FOUND', message: 'Resource not found' }, requestId: req.id }));
app.use(errorHandler);

return { app, server, io };
}
