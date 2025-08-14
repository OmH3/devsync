import { Router } from "express";
import { createDocController, deleteDocController, getDocByIdController, getWorkspaceDocsController, updateDocController, getUserRoleInDocumentController } from "../controllers/docs.controllers.js";

const router = Router()

// Create a new document
router.post("/create", createDocController);

// Get all documents in a workspace
router.get("/workspace/:workspaceId", getWorkspaceDocsController);

// Get a specific document
router.get("/:id", getDocByIdController);

// ✅ FIX: Change route to match the service call
router.get("/:docId/user-role", getUserRoleInDocumentController);

// Update a document
router.put("/:id", updateDocController);

// Delete a document
router.delete("/:id", deleteDocController);

export default router;