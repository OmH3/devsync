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

  // ✅ Add permission check
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.USE_WHITEBOARD]);

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

  // ✅ Add permission check
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const { whiteboards } = await getWorkspaceWhiteboardsService(workspaceId, userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Whiteboards fetched successfully",
    whiteboards,
  });
});

export const getWhiteboardByIdController = asyncHandler(async (req, res) => {
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const userId = req.user?._id;

  // ✅ FIX: Get whiteboard first, then check permissions
  const { whiteboard } = await getWhiteboardByIdService(whiteboardId, userId);

  // ✅ Add permission check AFTER getting whiteboard
  const { role } = await getMemberRoleInWorkspace(userId, whiteboard.workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  return res.status(HTTPSTATUS.OK).json({
    message: "Whiteboard fetched successfully",
    whiteboard,
  });
});

export const updateWhiteboardController = asyncHandler(async (req, res) => {
  const whiteboardId = whiteboardIdSchema.parse(req.params.whiteboardId);
  const body = updateWhiteboardSchema.parse(req.body);
  const userId = req.user?._id;

  // ✅ Get whiteboard first to check workspace
  const { whiteboard: existingWhiteboard } = await getWhiteboardByIdService(whiteboardId, userId);

  // ✅ Add permission check - exactly like your docs controller
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

  // ✅ Add permission check
  const { role } = await getMemberRoleInWorkspace(userId, whiteboard.workspaceId);
  roleGuard(role, [Permissions.EDIT_WHITEBOARD]);

  const result = await deleteWhiteboardService(whiteboardId, userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Whiteboard deleted successfully",
    result,
  });
});