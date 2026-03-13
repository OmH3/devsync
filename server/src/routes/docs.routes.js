import { Router } from "express";
import { createDocController, deleteDocController, getDocByIdController, getWorkspaceDocsController, updateDocController, getUserRoleInWorkspaceController } from "../controllers/docs.controllers.js";

const router = Router()

// Create a new document
router.post("/create", createDocController);

// Get all documents in a workspace
router.get("/workspace/:workspaceId", getWorkspaceDocsController);

// Get a specific document
router.get("/:id", getDocByIdController);

//FIX: Route to get user role in workspace (matching whiteboard pattern)
router.get("/user-role/:workspaceId", getUserRoleInWorkspaceController);

// Update a document
router.put("/:id", updateDocController);

// Delete a document
router.delete("/:id", deleteDocController);

export default router;