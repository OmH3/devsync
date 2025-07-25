import { Router } from "express";
import {
  createFileSystemItemController,
  deleteFileSystemItemController,
  getFileSystemItemByIdController,
  getWorkspaceFileSystemController,
  moveFileSystemItemController,
  updateFileSystemItemController,
} from "../controllers/filesystem.controller.js";

const router = Router();

// Create a new file or folder
router.post("/create", createFileSystemItemController);

// Get all file system items in a workspace
router.get("/workspace/:workspaceId", getWorkspaceFileSystemController);

// Get a specific file system item
router.get("/:id", getFileSystemItemByIdController);

// Update a file system item (rename)
router.put("/:id", updateFileSystemItemController);

// Move a file system item
router.put("/:id/move", moveFileSystemItemController);

// Delete a file system item
router.delete("/:id", deleteFileSystemItemController);

export default router;