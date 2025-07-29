import { Router } from "express";
import { deleteCodeEditorController, getCodeEditorByFileSystemIdController, updateCodeEditorController } from "../controllers/codeeditor.controller.js";

const router = Router();

// Get code editor by file system ID
router.get("/file/:fileSystemId", getCodeEditorByFileSystemIdController);

// Update code editor
router.put("/:codeEditorId", updateCodeEditorController);

// Delete code editor
router.delete("/:codeEditorId", deleteCodeEditorController);

export default router;