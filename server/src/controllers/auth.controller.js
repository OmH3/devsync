import passport from "passport";
import { config } from "../config/app.config.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { registerUserService } from "../services/auth.service.js";
import { registerSchema } from "../validation/auth.validation.js";

export const googleLoginCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  
  if (!user) {
    // ✅ Only redirect to failure if authentication actually failed
    return res.redirect(
      `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure&message=Authentication failed`
    );
  }

  const currentWorkspace = user.currentWorkspace;

  if (currentWorkspace) {
    // ✅ User has a workspace, redirect to it
    return res.redirect(
      `${config.FRONTEND_ORIGIN}/workspace/${currentWorkspace}?status=success`
    );
  } else {
    // ✅ User doesn't have a workspace, redirect to dashboard to show workspace list
    return res.redirect(
      `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=success&redirect=dashboard`
    );
  }
});

export const registerUserController = asyncHandler(async (req, res) => {
  const body = registerSchema.parse({
    ...req.body,
  });

  await registerUserService(body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "User created successfully",
  });
});

export const loginUserController = asyncHandler(async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: info?.message || "Invalid email or password",
      });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      return res.status(HTTPSTATUS.OK).json({
        message: "Logged in successfully",
        user,
      });
    });
  })(req, res, next); //passport.authenticate return middleware function which needs to be called
});


// STILL COULNDT DELETE THE SESSION COOKIE
export const logOutController = asyncHandler(async(req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res
                .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
                .json({ error: "Failed to log out" });
        }
        
        // Destroy the session completely
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
                return res
                    .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
                    .json({ error: "Failed to destroy session" });
            }
            
            // Also clear any other auth-related cookies if they exist
            res.clearCookie('session', {
                maxAge: 0,
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax"
            });
            
            return res
                .status(HTTPSTATUS.OK)
                .json({ message: "Logged out successfully" });
        });
    });
});