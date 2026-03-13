import { Router } from "express";
import {
  createWhiteboardController,
  getWorkspaceWhiteboardsController,
  getWhiteboardByIdController,
  updateWhiteboardController,
  deleteWhiteboardController,
  getUserRoleInWhiteboardController
} from "../controllers/whiteboard.controller.js";

const router = Router();

// Create whiteboard
router.post("/create", createWhiteboardController);

// Get all whiteboards in workspace
router.get("/workspace/:workspaceId", getWorkspaceWhiteboardsController);

//FIX: Change route to match the service call
router.get("/:whiteboardId/user-role", getUserRoleInWhiteboardController);

// Get whiteboard by ID
router.get("/:whiteboardId", getWhiteboardByIdController);

// Update whiteboard (content, title, description)
router.put("/:whiteboardId", updateWhiteboardController);

// Delete whiteboard
router.delete("/:whiteboardId", deleteWhiteboardController);


export default router;