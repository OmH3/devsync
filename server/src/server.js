import express from "express";
// socket
import { createServer } from "http";
import { Server } from "socket.io";

import workspaceRoutes from "./routes/workspace.routes.js";
import memberRoutes from "./routes/member.routes.js";
import docsRoutes from "./routes/docs.routes.js";
import filesystemRoutes from "./routes/filesystem.routes.js";
import codeeditorRoutes from "./routes/codeeditor.routes.js";
import "dotenv/config";
import { config } from "./config/app.config.js";
import session from "express-session";
import MongoStore from 'connect-mongo';
import passport from "passport";
import cors from "cors";
import "./config/passport.config.js";
import connectDatabase from "./config/database.config.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import isAuthenticated from "./middleware/isAuthenticated.middleware.js";
import whiteboardRoutes from "./routes/whiteboard.routes.js";
import audioRoomRoutes from "./routes/audioroom.routes.js";

// Fix this import path
import { setupSocketIO } from "./config/socket.config.js";
import { setSocketIO as setWhiteboardSocketIO } from "./controllers/whiteboard.controller.js";
import { setSocketIO as setDocsSocketIO } from "./controllers/docs.controllers.js";
import { setSocketIO as setCodeEditorSocketIO } from "./controllers/codeeditor.controller.js";
import { setSocketIO as setFileSystemSocketIO } from "./controllers/filesystem.controller.js";
import streamRoutes from "./routes/stream.routes.js";

import { setSocketIO as setStreamSocketIO } from "./controllers/stream.controller.js";
import { setSocketIO as setAudioRoomSocketIO } from "./controllers/audioroom.controller.js";

import healthRoutes from './routes/health.routes.js';

const app = express();
const server = createServer(app); // ✅ Create HTTP server
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
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
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: true,
<<<<<<< HEAD
    sameSite: "none",
    path: "/",
=======
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser decide
>>>>>>> 15d8cd5fece320cf8623e351745930d1a1f3b3ab
  },
  proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// ✅ CRITICAL: Configure CORS AFTER session but BEFORE routes
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://devsync-mu.vercel.app',
      process.env.FRONTEND_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // CRITICAL: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ✅ Setup Socket.IO with session sharing
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ✅ Initialize Socket.IO handlers
setupSocketIO(io);

// ✅ Pass Socket.IO instance to controllers
setWhiteboardSocketIO(io);
setDocsSocketIO(io);
setCodeEditorSocketIO(io); // ✅ Add this
setFileSystemSocketIO(io);
setStreamSocketIO(io); // Add this line
setAudioRoomSocketIO(io); // ✅ Add this line

// app.get(
//   "/",
//   asyncHandler(async (req, res, next) => {
//     if (req.query.error === "true") {
//       throw new BadRequestException(
//         "This is a bad request",
//         ErrorCodeEnum.AUTH_INVALID_TOKEN
//       );
//     }
//     return res.status(HTTPSTATUS.OK).json({
//       message: "Hello Subscribe to the channel & share",
//     });
//   })
// );

app.use(`${BASE_PATH}/`, healthRoutes);

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);
app.use(`${BASE_PATH}/member`, isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/docs`, isAuthenticated, docsRoutes);
app.use(`${BASE_PATH}/filesystem`, isAuthenticated, filesystemRoutes);
app.use(`${BASE_PATH}/codeeditor`, isAuthenticated, codeeditorRoutes);
app.use(`${BASE_PATH}/whiteboard`, isAuthenticated, whiteboardRoutes);
app.use(`${BASE_PATH}/stream`, isAuthenticated, streamRoutes);
app.use(`${BASE_PATH}/audioroom`, isAuthenticated, audioRoomRoutes);

// create error handler
app.use(errorHandler);

// ✅ Use server instead of app for listening
server.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});
