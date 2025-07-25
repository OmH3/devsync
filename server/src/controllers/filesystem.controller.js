import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import {
  createFileSystemItemService,
  deleteFileSystemItemService,
  getFileSystemItemByIdService,
  getWorkspaceFileSystemService,
  moveFileSystemItemService,
  updateFileSystemItemService,
} from "../services/filesystem.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  createFileSystemItemSchema,
  fileSystemIdSchema,
  moveFileSystemItemSchema,
  updateFileSystemItemSchema,
} from "../validation/filesystem.validation.js";

export const createFileSystemItemController = asyncHandler(async (req, res) => {
  const body = createFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, body.workspaceId);
  roleGuard(role, [Permissions.USE_CODE_EDITOR]);

  const { fileSystemItem } = await createFileSystemItemService(userId, body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "File system item created successfully",
    fileSystemItem,
  });
});

export const getWorkspaceFileSystemController = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const { fileSystemItems } = await getWorkspaceFileSystemService(workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "File system items fetched successfully",
    fileSystemItems,
  });
});

export const getFileSystemItemByIdController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item fetched successfully",
    fileSystemItem,
  });
});

export const updateFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = updateFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const { fileSystemItem } = await updateFileSystemItemService(fileSystemId, userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item updated successfully",
    fileSystemItem,
  });
});

export const moveFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = moveFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const { fileSystemItem } = await moveFileSystemItemService(fileSystemId, userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item moved successfully",
    fileSystemItem,
  });
});

export const deleteFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
  roleGuard(role, [Permissions.EDIT_CODE_EDITOR]);

  const result = await deleteFileSystemItemService(fileSystemId, userId);

  return res.status(HTTPSTATUS.OK).json(result);
});