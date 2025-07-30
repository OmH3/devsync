import { Router } from "express";
import { executeCodeController, getCodeEditorByFileSystemIdController,getExecutionHistoryController, updateCodeEditorController } from "../controllers/codeeditor.controller.js";

const router = Router();

// Get code editor by file system ID
router.get("/file/:fileSystemId", getCodeEditorByFileSystemIdController);

// Update code editor
router.put("/:codeEditorId", updateCodeEditorController);

// Execute code from code editor
router.post("/:codeEditorId/execute", executeCodeController);

// Get execution history
router.get("/:codeEditorId/executions", getExecutionHistoryController);

export default router;