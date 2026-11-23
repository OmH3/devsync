import { config } from "../config/app.config.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { registerUserService, verifyUserService } from "../services/auth.service.js";
import { clearSessionCookie, setSessionCookie, revokeSessionToken, extractTokenFromHeader } from "../utils/jwt.js";
import { loginSchema, registerSchema } from "../validation/auth.validation.js";

export const googleLoginCallback = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.redirect(
      `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure&message=Authentication failed`
    );
  }

  await setSessionCookie(res, user);
  return res.redirect(
    `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=success&redirect=dashboard`
  );
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

export const loginUserController = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await verifyUserService({ email, password });

  await setSessionCookie(res, user);

  return res.status(HTTPSTATUS.OK).json({
    message: "Logged in successfully",
    user,
  });
});

export const logOutController = asyncHandler(async (req, res) => {
  await revokeSessionToken(extractTokenFromHeader(req.headers.cookie, req.headers.authorization));
  clearSessionCookie(res);
  return res
    .status(HTTPSTATUS.OK)
    .json({ message: "Logged out successfully" });
});
