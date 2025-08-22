import passport from "passport";
import { config } from "../config/app.config.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { registerUserService } from "../services/auth.service.js";
import { registerSchema } from "../validation/auth.validation.js";

export const googleLoginCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  
  console.log('🔍 === GOOGLE OAUTH CALLBACK ===');
  console.log('🔍 User found:', !!user);
  console.log('🔍 User ID:', user?._id);
  console.log('🔍 Session ID:', req.sessionID);
  
  if (!user) {
    console.log('❌ No user found, redirecting to failure');
    return res.redirect(
      `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure&message=Authentication failed`
    );
  }

  // ✅ CRITICAL: Log the user into the session
  req.logIn(user, (err) => {
    if (err) {
      console.error('❌ Error logging in user:', err);
      return res.redirect(
        `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure&message=Login failed`
      );
    }

    console.log('✅ User logged in successfully');
    console.log('✅ Session after login:', req.sessionID);
    console.log('✅ Redirecting to:', `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=success`);
    
    // ✅ Redirect to frontend callback
    return res.redirect(
      `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=success&redirect=dashboard`
    );
  });
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
        
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
                return res
                    .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
                    .json({ error: "Failed to destroy session" });
            }
            
            // ✅ Clear the correct cookie name
            res.clearCookie('session', { // Changed from 'session'
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
            });
            
            return res
                .status(HTTPSTATUS.OK)
                .json({ message: "Logged out successfully" });
        });
    });
});