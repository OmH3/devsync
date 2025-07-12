import express from 'express'
import 'dotenv/config';
import { config } from './config/app.config.js';
import session from "express-session";
import passport from 'passport';
import cors from 'cors';
import "./config/passport.config.js";
import { asyncHandler } from './middleware/async-handler.middleware.js';
import { BadRequestException } from './utils/app-error.js';
import { HTTPSTATUS } from './config/http.config.js';
import connectDatabase from './config/database.config.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import isAuthenticated from './middleware/isAuthenticated.middleware.js';
import workspaceRoutes from './routes/workspace.routes.js';
const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'session',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: '/',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
}));

app.get('/', asyncHandler(async(req, res, next)=>{
    if (req.query.error === 'true') {
        throw new BadRequestException(
            "This is a bad request",
            ErrorCodeEnum.AUTH_INVALID_TOKEN
        );
    }
    return res.status(HTTPSTATUS.OK).json({
      message: "Hello Subscribe to the channel & share",
    });
}))

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`,isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);

// create error handler
app.use(errorHandler);

// create app listener
app.listen(config.PORT, async()=>{
    console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
    await connectDatabase();
})