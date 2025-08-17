import { Router } from "express";
import {
  getStreamTokenController,
  startAudioRoomController,
  joinAudioRoomController,
  leaveAudioRoomController,
  endAudioRoomController,
  getAudioRoomStatusController
} from "../controllers/audioroom.controller.js";

const router = Router();

// ✅ Get Stream token for audio room
router.get("/token", getStreamTokenController);

// ✅ Start audio room
router.post("/start", startAudioRoomController);

// ✅ Join audio room (for tracking)
router.post("/join", joinAudioRoomController);

// ✅ Leave audio room
router.post("/leave", leaveAudioRoomController);

// ✅ End audio room
router.post("/end", endAudioRoomController);

// ✅ Get audio room status
router.get("/status/:workspaceId", getAudioRoomStatusController);

export default router;