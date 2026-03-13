import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { BadRequestException } from "../utils/app-error.js";
import { workspaceIdSchema } from "../validation/audioroom.validation.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
//FIX: Import from audioroom.service.js, not stream.service.js
import { generateStreamToken } from "../services/audioroom.service.js";
//Get socket instance
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

//Get Stream token for audio room
export const getStreamTokenController = asyncHandler(async (req, res) => {
  const workspaceId = req.user?.currentWorkspace;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check if user is a member of the workspace
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Generate Stream token
  const { token, user } = await generateStreamToken(userId, req.user);

  return res.status(HTTPSTATUS.OK).json({
    message: "Stream token generated successfully",
    token,
    user,
    workspaceId
  });
});

//Start audio room
export const startAudioRoomController = asyncHandler(async (req, res) => {
  const { roomName } = req.body;
  const workspaceId = req.user?.currentWorkspace;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check if user is a member
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Simple audio room ID (no model needed!)
  const audioRoomId = `audio-room-${workspaceId}`;
  const displayName = roomName || `${workspaceId} Audio Room`;

  //Emit socket event to workspace members
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('audio-room-started', {
      audioRoomId,
      workspaceId,
      displayName,
      startedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  console.log(' Audio room started:', {
    audioRoomId,
    workspaceId,
    startedBy: userId
  });

  return res.status(HTTPSTATUS.OK).json({
    message: "Audio room started successfully",
    audioRoomId,
    displayName,
    workspaceId
  });
});

//Join audio room (just for tracking)
export const joinAudioRoomController = asyncHandler(async (req, res) => {
  const { audioRoomId } = req.body;
  const workspaceId = req.user?.currentWorkspace;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check if user is a member
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Emit socket event
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('participant-joined-audio-room', {
      audioRoomId,
      workspaceId,
      participant: {
        userId,
        userName: req.user?.name,
        userImage: req.user?.profilePicture
      },
      timestamp: new Date()
    });
  }

  console.log(' User joined audio room:', {
    audioRoomId,
    userId,
    workspaceId
  });

  return res.status(HTTPSTATUS.OK).json({
    message: "Joined audio room successfully",
    audioRoomId,
    workspaceId
  });
});

//Leave audio room
export const leaveAudioRoomController = asyncHandler(async (req, res) => {
  const { audioRoomId } = req.body;
  const workspaceId = req.user?.currentWorkspace;
  const userId = req.user?._id;

  //Emit socket event
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('participant-left-audio-room', {
      audioRoomId,
      workspaceId,
      userId,
      timestamp: new Date()
    });
  }

  console.log(' User left audio room:', {
    audioRoomId,
    userId,
    workspaceId
  });

  return res.status(HTTPSTATUS.OK).json({
    message: "Left audio room successfully",
    audioRoomId
  });
});

//End audio room
export const endAudioRoomController = asyncHandler(async (req, res) => {
  const { audioRoomId } = req.body;
  const workspaceId = req.user?.currentWorkspace;
  const userId = req.user?._id;

  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check if user is a member (any member can end for now)
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Emit socket event to end audio room for everyone
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('audio-room-ended', {
      audioRoomId,
      workspaceId,
      endedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  console.log(' Audio room ended:', {
    audioRoomId,
    workspaceId,
    endedBy: userId
  });

  return res.status(HTTPSTATUS.OK).json({
    message: "Audio room ended successfully",
    audioRoomId
  });
});

//Get audio room status for workspace
export const getAudioRoomStatusController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  //Check if user is a member
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Since we don't have a model, just return basic status
  // In a real app, you might track this in Redis or memory
  const audioRoomId = `audio-room-${workspaceId}`;

  return res.status(HTTPSTATUS.OK).json({
    message: "Audio room status fetched successfully",
    isActive: false, // You can track this in Redis if needed
    audioRoomId,
    workspaceId,
    canEndRoom: true // All members can end for simplicity
  });
});