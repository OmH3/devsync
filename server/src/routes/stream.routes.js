import express from "express";
import { 
  getStreamTokenController, 
  getCallStatusController,
  joinCallController,
} from "../controllers/stream.controller.js";

const router = express.Router();

// GET /api/stream/token - Get Stream.io token for authenticated user
router.get("/token", getStreamTokenController);

// GET /api/stream/call-status/:callId - Get status of a specific call
router.get("/call-status/:callId", getCallStatusController);

// POST /api/stream/join-call/:callId - Join a call
router.post("/join-call/:callId", joinCallController);

export default router;