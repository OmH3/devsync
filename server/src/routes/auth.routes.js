import { Router } from "express";
import { config } from "../config/app.config.js";
import passport from "passport";
import { googleLoginCallback, loginUserController, logOutController, registerUserController } from "../controllers/auth.controller.js";

const router = Router();

const failedUrl = `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure`;

router.post("/register", registerUserController);

router.post("/login", loginUserController);

router.post("/logout", logOutController);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get('/google/callback',passport.authenticate('google',{
    failureRedirect: "/login",
}),
googleLoginCallback
)

export default router;