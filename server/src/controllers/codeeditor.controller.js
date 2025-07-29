import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import {
  addCollaboratorService,
  deleteCodeEditorService,
  getCodeEditorByFileSystemIdService,
  getCodeEditorByIdService,
  getWorkspaceCodeEditorsService,
  removeCollaboratorService,
  updateCodeEditorService
} from "../services/codeeditor.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  codeEditorIdSchema,
  updateCodeEditorSchema
} from "../validation/codeeditor.validation.js";
import { fileSystemIdSchema } from "../validation/filesystem.validation.js";

export const getWorkspaceCodeEditorsController = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const { codeEditors } = await getWorkspaceCodeEditorsService(workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editors fetched successfully",
    codeEditors,
  });
});

export const getCodeEditorByIdController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { codeEditor } = await getCodeEditorByIdService(codeEditorId);

  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor fetched successfully",
    codeEditor,
  });
});

export const getCodeEditorByFileSystemIdController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.fileSystemId);
  const userId = req.user?._id;

  const { codeEditor } = await getCodeEditorByFileSystemIdService(fileSystemId);

  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor fetched successfully",
    codeEditor,
  });
});

export const updateCodeEditorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const body = updateCodeEditorSchema.parse(req.body);
  const userId = req.user?._id;

  const { codeEditor: existingEditor } = await getCodeEditorByIdService(codeEditorId);

  const { role } = await getMemberRoleInWorkspace(userId, existingEditor.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const { codeEditor } = await updateCodeEditorService(codeEditorId, userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor updated successfully",
    codeEditor,
  });
});

export const deleteCodeEditorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { codeEditor } = await getCodeEditorByIdService(codeEditorId);

  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const result = await deleteCodeEditorService(codeEditorId, userId);

  return res.status(HTTPSTATUS.OK).json(result);
});

export const addCollaboratorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.id);
  const { collaboratorUserId } = req.body;
  const userId = req.user?._id;

  const { codeEditor: existingEditor } = await getCodeEditorByIdService(codeEditorId);

  const { role } = await getMemberRoleInWorkspace(userId, existingEditor.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const { codeEditor } = await addCollaboratorService(codeEditorId, userId, collaboratorUserId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Collaborator added successfully",
    codeEditor,
  });
});

export const removeCollaboratorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.id);
  const { collaboratorUserId } = req.body;
  const userId = req.user?._id;

  const { codeEditor: existingEditor } = await getCodeEditorByIdService(codeEditorId);

  const { role } = await getMemberRoleInWorkspace(userId, existingEditor.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const { codeEditor } = await removeCollaboratorService(codeEditorId, userId, collaboratorUserId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Collaborator removed successfully",
    codeEditor,
  });
});