import { Router } from "express";
import {
  createWhiteboardController,
  getWorkspaceWhiteboardsController,
  getWhiteboardByIdController,
  updateWhiteboardController,
  deleteWhiteboardController,
} from "../controllers/whiteboard.controller.js";

const router = Router();

// Create whiteboard
router.post("/create", createWhiteboardController);

// Get all whiteboards in workspace
router.get("/workspace/:workspaceId", getWorkspaceWhiteboardsController);

// Get whiteboard by ID
router.get("/:whiteboardId", getWhiteboardByIdController);

// Update whiteboard (content, title, description)
router.put("/:whiteboardId", updateWhiteboardController);

// Delete whiteboard
router.delete("/:whiteboardId", deleteWhiteboardController);

export default router;