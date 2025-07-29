import { Router } from "express";
import {
  addCollaboratorController,
  createCodeEditorController,
  deleteCodeEditorController,
  getCodeEditorByFileSystemIdController,
  getCodeEditorByIdController,
  getWorkspaceCodeEditorsController,
  removeCollaboratorController,
  updateCodeEditorController,
} from "../controllers/codeeditor.controller.js";

const router = Router();

// Create a new code editor
router.post("/create", createCodeEditorController);

// Get all code editors in a workspace
router.get("/workspace/:workspaceId", getWorkspaceCodeEditorsController);

// Get a specific code editor
router.get("/:id", getCodeEditorByIdController);

// Get code editor by file system ID
router.get("/file/:fileSystemId", getCodeEditorByFileSystemIdController);

// Update a code editor
router.put("/:id", updateCodeEditorController);

// Delete a code editor
router.delete("/:id", deleteCodeEditorController);

// Add collaborator
router.post("/:id/collaborators", addCollaboratorController);

// Remove collaborator
router.delete("/:id/collaborators", removeCollaboratorController);

export default router;



// Definitely consider sandboxing execution in Docker.