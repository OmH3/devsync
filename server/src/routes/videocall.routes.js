import { Router } from "express";
import {
  startVideoCallController,
  joinVideoCallController,
  endVideoCallController,
  getVideoCallStatusController,
} from "../controllers/videocall.controller.js";

const router = Router();

// Start video call
router.post("/start", startVideoCallController);

// Join video call
router.post("/join", joinVideoCallController);

// End video call
router.post("/end", endVideoCallController);

// Get video call status
router.get("/status/:workspaceId", getVideoCallStatusController);

export default router;