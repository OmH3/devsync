import asyncHandler from "../middleware/async-handler.middleware.js";
import { HTTPSTATUS } from "../utils/http-status-code.js";
import { Permissions } from "../enums/role.enum.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  startVideoCallSchema,
  joinVideoCallSchema,
  endVideoCallSchema,
  workspaceIdSchema,
} from "../validation/videocall.validation.js";
import {
  startVideoCallService,
  joinVideoCallService,
  endVideoCallService,
  getVideoCallStatusService,
} from "../services/videocall.service.js";

// ✅ Get socket instance
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export const startVideoCallController = asyncHandler(async (req, res) => {
  const body = startVideoCallSchema.parse(req.body);
  const userId = req.user?._id;

  // ✅ Check permissions
  const { role } = await getMemberRoleInWorkspace(userId, body.workspaceId);
  roleGuard(role, [Permissions.START_VIDEO_CALL]);

  const result = await startVideoCallService(userId, body.workspaceId);

  // ✅ Emit socket event to notify workspace members
  if (io) {
    io.to(`workspace:${body.workspaceId}`).emit('video-call-started', {
      sessionId: result.sessionId,
      startedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Video call started successfully",
    ...result,
  });
});

export const joinVideoCallController = asyncHandler(async (req, res) => {
  const body = joinVideoCallSchema.parse(req.body);
  const userId = req.user?._id;

  // ✅ Check permissions
  const { role } = await getMemberRoleInWorkspace(userId, body.workspaceId);
  roleGuard(role, [Permissions.JOIN_VIDEO_CALL]);

  const result = await joinVideoCallService(userId, body.workspaceId);

  // ✅ Emit socket event to notify others in the call
  if (io) {
    io.to(`workspace:${body.workspaceId}`).emit('user-joined-video-call', {
      sessionId: result.sessionId,
      joinedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Joined video call successfully",
    ...result,
  });
});

export const endVideoCallController = asyncHandler(async (req, res) => {
  const body = endVideoCallSchema.parse(req.body);
  const userId = req.user?._id;

  // ✅ Check permissions
  const { role } = await getMemberRoleInWorkspace(userId, body.workspaceId);
  roleGuard(role, [Permissions.END_VIDEO_CALL]);

  const result = await endVideoCallService(userId, body.workspaceId);

  // ✅ Emit socket event to notify all participants
  if (io) {
    io.to(`workspace:${body.workspaceId}`).emit('video-call-ended', {
      endedSessionId: result.endedSessionId,
      endedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Video call ended successfully",
    ...result,
  });
});

export const getVideoCallStatusController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  // ✅ Check permissions
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.VIEW_ONLY]);

  const result = await getVideoCallStatusService(userId, workspaceId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Video call status fetched successfully",
    ...result,
  });
});