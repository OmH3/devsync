import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import {
  changeMemberRoleService,
  createWorkspaceService,
  deleteWorkspaceByIdService,
  getAllWorkspacesUserIsMemberService,
  getWorkspaceByIdService,
  getWorkspaceMembersService,
  updateWorkspaceByIdService,
} from "../services/workspace.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  changeRoleSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "../validation/workspace.validation.js";

export const createWorskpaceController = asyncHandler(async (req, res) => {
  const body = createWorkspaceSchema.parse(req.body);

  const userId = req.user?._id;

  const { workspace } = await createWorkspaceService(userId, body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Workspace created successfully",
    workspace,
  });
});

export const getAllWorkspacesUserIsMemberController = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;

    const { workspaces } = await getAllWorkspacesUserIsMemberService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User workspaces fetched successfully",
      workspaces,
    });
  }
);

export const getWorkspaceByIdController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  await getMemberRoleInWorkspace(userId, workspaceId);

  const { workspace } = await getWorkspaceByIdService(workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Workspace fetched successfully",
    workspace,
  });
});

export const getWorkspaceMembersController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const { members, roles } = await getWorkspaceMembersService(workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Workspace members retrieved successfully",
    members,
    roles,
  });
});

export const changeWorkspaceMemberRoleController = asyncHandler(
  async (req, res) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const { memberId, roleId } = changeRoleSchema.parse(req.body);

    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.CHANGE_MEMBER_ROLE]);

    const { member } = await changeMemberRoleService(
      workspaceId,
      memberId,
      roleId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Member Role changed successfully",
      member,
    });
  }
);

export const updateWorkspaceByIdController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.id);
  const { name, description } = updateWorkspaceSchema.parse(req.body);

  const userId = req.user?._id;

  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.EDIT_WORKSPACE]);

  const { workspace } = await updateWorkspaceByIdService(
    workspaceId,
    name,
    description
  );

  return res.status(HTTPSTATUS.OK).json({
    message: "Workspace updated successfully",
    workspace,
  });
});


export const deleteWorkspaceByIdController = asyncHandler(
  async (req, res) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);

    const userId = req.user?._id;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.DELETE_WORKSPACE]);

    const { currentWorkspace } = await deleteWorkspaceByIdService(
      workspaceId,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace deleted successfully",
      currentWorkspace,
    });
  }
);