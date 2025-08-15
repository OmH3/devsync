import { Router } from "express";
import {
  createFileSystemItemController,
  deleteFileSystemItemController,
  getFileSystemItemByIdController,
  getWorkspaceFileSystemController,
  moveFileSystemItemController,
  updateFileSystemItemController,
  getUserRoleInFileSystemController,
  getFileSystemItemContentController,
  updateFileSystemItemContentController,
  getFileSystemTreeController,
  duplicateFileSystemItemController,
  bulkDeleteFileSystemItemsController,
  getFileSystemItemHistoryController
} from "../controllers/filesystem.controller.js";

const router = Router();

// ✅ Create a new file or folder (existing)
router.post("/create", createFileSystemItemController);

// ✅ Get all file system items in a workspace (existing)
router.get("/workspace/:workspaceId", getWorkspaceFileSystemController);

// ✅ Get file system tree structure for workspace
router.get("/workspace/:workspaceId/tree", getFileSystemTreeController);

// ✅ Get a specific file system item (existing)
router.get("/:id", getFileSystemItemByIdController);

// ✅ Get user role and permissions for a file system item
router.get("/:id/user-role", getUserRoleInFileSystemController);

// ✅ Get file content (for files)
router.get("/:id/content", getFileSystemItemContentController);

// ✅ Update file content (for real-time collaboration)
router.put("/:id/content", updateFileSystemItemContentController);

// ✅ Update a file system item - rename, metadata (existing)
router.put("/:id", updateFileSystemItemController);

// ✅ Move a file system item (existing)
router.put("/:id/move", moveFileSystemItemController);

// ✅ Duplicate a file system item
router.post("/:id/duplicate", duplicateFileSystemItemController);

// ✅ Get file system item history/versions
router.get("/:id/history", getFileSystemItemHistoryController);

// ✅ Bulk delete file system items
router.delete("/bulk", bulkDeleteFileSystemItemsController);

// ✅ Delete a file system item (existing)
router.delete("/:id", deleteFileSystemItemController);

export default router;