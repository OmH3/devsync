import { HTTPSTATUS } from "../config/http.config";
import { Permissions } from "../enums/role.enum";
import { asyncHandler } from "../middleware/async-handler.middleware";
import {
  createDocService,
  getDocByIdService,
  getWorkspaceDocsService,
} from "../services/docs.service";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { roleGuard } from "../utils/roleGuard";
import { docIdSchema, updateDocSchema } from "../validation/docs.validation";

export const createDocController = asyncHandler(async (req, res) => {
  const body = createDocSchema.parse(req.body);
  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, body.workspaceId);
  roleGuard(role, [Permissions.USE_DOCS]);

  const { doc } = await createDocService(userId, body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Document created successfully",
    doc,
  });
});

export const getWorkspaceDocsController = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.user?._id;

  // Check if user is a member of the workspace
  const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const { docs } = await getWorkspaceDocsService(workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Documents fetched successfully",
    docs,
  });
});

export const getDocByIdController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { doc } = await getDocByIdService(docId);

  // Check if user is a member of the workspace
  const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  return res.status(HTTPSTATUS.OK).json({
    message: "Document fetched successfully",
    doc,
  });
});

export const updateDocController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const body = updateDocSchema.parse(req.body);
  const userId = req.user?._id;

  const { doc: existingDoc } = await getDocByIdService(docId);

  const { role } = await getMemberRoleInWorkspace(
    userId,
    existingDoc.workspaceId
  );
  roleGuard(role, [Permissions.EDIT_DOCS]);

  const { doc } = await updateDocService(docId, userId, body);

  return res.status(HTTPSTATUS.OK).json({
    message: "Document updated successfully",
    doc,
  });
});

export const deleteDocController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { doc } = await getDocByIdService(docId);
  const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
  roleGuard(role, [Permissions.EDIT_DOCS]);

  const result = await deleteDocService(docId, userId);

  return res.status(HTTPSTATUS.OK).json(result);
});
