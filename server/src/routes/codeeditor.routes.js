import { Router } from "express";
import { 
  executeCodeController, 
  getCodeEditorByIdController,
  getExecutionHistoryController, 
  updateCodeEditorController,
  getUserRoleInCodeEditorController,
  createCodeEditorController,
  getWorkspaceCodeEditorsController,
  deleteCodeEditorController,
  saveCodeEditorContentController,
  getCodeEditorByFileSystemIdController
} from "../controllers/codeeditor.controller.js";

const router = Router();

//Create a new code editor (for new files)
router.post("/create", createCodeEditorController);

//Get all code editors in a workspace
router.get("/workspace/:workspaceId", getWorkspaceCodeEditorsController);

//FIX: Should be:
router.get("/file/:fileSystemId", getCodeEditorByFileSystemIdController);
router.get("/:codeEditorId", getCodeEditorByIdController); //Correct controller

//Get user role and permissions for a code editor (matching docs pattern)
router.get("/:codeEditorId/user-role", getUserRoleInCodeEditorController);

//Update code editor (existing functionality)
router.put("/:codeEditorId", updateCodeEditorController);

//Save code editor content (dedicated endpoint for real-time saves)
router.put("/:codeEditorId/save", saveCodeEditorContentController);

//Execute code from code editor (existing functionality)
router.post("/:codeEditorId/execute", executeCodeController);

//Get execution history (existing functionality)
router.get("/:codeEditorId/executions", getExecutionHistoryController);

//Delete code editor
router.delete("/:codeEditorId", deleteCodeEditorController);

export default router;