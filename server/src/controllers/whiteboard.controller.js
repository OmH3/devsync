import {asyncHandler} from "../middleware/async-handler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { BadRequestException } from "../utils/app-error.js";
import {
  createWhiteboardSchema,
  updateWhiteboardSchema,
  whiteboardIdSchema,
  workspaceIdSchema,
} from "../validation/whiteboard.validation.js";
import {
  createWhiteboardService,
  getWorkspaceWhiteboardsService,
  getWhiteboardByIdService,
  updateWhiteboardService,
  deleteWhiteboardService,
} from "../services/whiteboard.service.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import { Permissions } from "../enums/role.enum.js";

// ✅ Get socket instance (we'll pass this from server.js)
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export const createWhiteboardController = asyncHandler(async (req, res) => {
  const body = createWhiteboardSchema.parse(req.body);
  const userId = req.user?._id;
  const workspaceId = req.user?.currentWorkspace;

  // ✅ Check if user has a current workspace
  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  // ✅ Only OWNER and ADMIN can create whiteboards
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.EDIT_WHITEBOARD]); // Changed from USE_WHITEBOARD

  // ✅ Pass workspaceId to the service
  const { whiteboard } = await createWhiteboardService(userId, { 
    ...body, 
    workspaceId 
  });

  // ✅ Emit socket event
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('whiteboard-created', {
      whiteboard,
      createdBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Whiteboard created successfully",
    whiteboard,
  });
});

export const getWorkspaceWhiteboardsController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  // ✅ Allow all workspace members to VIEW whiteboards (including MEMBER role)
  // Just check if user is a member of the workspace - no specific permission check
  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('User role for viewing whiteboards:', role);
    
    // ✅ As long as user has any role in workspace, they can view whiteboards
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { whiteboards } = await getWorkspaceWhiteboardsService(workspaceId, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Whiteboards fetched successfully",
      whiteboards,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

export const getWhiteboardByIdController = asyncHandler(async (req, res) => {
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const userId = req.user?._id;

  // ✅ Get whiteboard first, then check if user is a member
  const { whiteboard } = await getWhiteboardByIdService(whiteboardId, userId);

  // ✅ Allow all workspace members to VIEW whiteboards (including MEMBER role)
  try {
    const { role } = await getMemberRoleInWorkspace(userId, whiteboard.workspaceId);
    console.log('User role for viewing whiteboard:', role);
    
    // ✅ As long as user has any role in workspace, they can view the whiteboard
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Whiteboard fetched successfully",
      whiteboard,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

export const updateWhiteboardController = asyncHandler(async (req, res) => {
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const body = updateWhiteboardSchema.parse(req.body);
  const userId = req.user?._id;

  // ✅ Get whiteboard first to check workspace
  const { whiteboard: existingWhiteboard } = await getWhiteboardByIdService(whiteboardId, userId);

  // ✅ Only OWNER and ADMIN can edit whiteboards
  const { role } = await getMemberRoleInWorkspace(
    userId,
    existingWhiteboard.workspaceId
  );
  roleGuard(role, [Permissions.EDIT_WHITEBOARD]);

  const { whiteboard } = await updateWhiteboardService(whiteboardId, userId, body);

  // ✅ Emit socket event for real-time updates
  if (io) {
    io.to(`whiteboard:${whiteboardId}`).emit('whiteboard-updated', {
      whiteboardId,
      updates: body,
      updatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Whiteboard updated successfully",
    whiteboard,
  });
});

export const deleteWhiteboardController = asyncHandler(async (req, res) => {
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const userId = req.user?._id;

  // ✅ Get whiteboard first to check workspace
  const { whiteboard } = await getWhiteboardByIdService(whiteboardId, userId);

  // ✅ Only OWNER and ADMIN can delete whiteboards
  const { role } = await getMemberRoleInWorkspace(userId, whiteboard.workspaceId);
  roleGuard(role, [Permissions.EDIT_WHITEBOARD]);

  const result = await deleteWhiteboardService(whiteboardId, userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Whiteboard deleted successfully",
    result,
  });
});

export const getUserRoleInWhiteboardController = asyncHandler(async (req, res) => {
  console.log('getUserRoleInWhiteboardController called with:', req.params);
  
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const userId = req.user?._id;

  console.log('Fetching role for userId:', userId, 'in whiteboard:', whiteboardId);

  // ✅ Get whiteboard first
  const { whiteboard } = await getWhiteboardByIdService(whiteboardId, userId);
  
  // ✅ Get user's role in the workspace
  try {
    const { role } = await getMemberRoleInWorkspace(userId, whiteboard.workspaceId);
    console.log('Found role:', role, 'for user in workspace:', whiteboard.workspaceId);

    // ✅ Check if role was found
    if (!role) {
      console.error('No role found for user in workspace');
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    // ✅ Return role and permissions - allow viewing for all members
    return res.status(HTTPSTATUS.OK).json({
      message: "User role fetched successfully",
      role: role,
      permissions: {
        canEdit: role === 'OWNER' || role === 'ADMIN', // Only OWNER and ADMIN can edit
        canView: true, // All workspace members can view
        canCreate: role === 'OWNER' || role === 'ADMIN', // Only OWNER and ADMIN can create
        canDelete: role === 'OWNER' || role === 'ADMIN'  // Only OWNER and ADMIN can delete
      }
    });
  } catch (error) {
    console.error('Error fetching member role:', error);
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});