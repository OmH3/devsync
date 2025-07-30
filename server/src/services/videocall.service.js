import WorkspaceModel from "../models/Workspace.model.js";
import MemberModel from "../models/Member.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import { v4 as uuidv4 } from "uuid";

export const startVideoCallService = async (userId, workspaceId) => {
  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if video call is already active
  if (workspace.tools.videoCall.sessionId) {
    throw new BadRequestException("Video call is already active in this workspace");
  }

  // Start video call
  const sessionId = `videocall_${uuidv4()}_${Date.now()}`;
  workspace.tools.videoCall.sessionId = sessionId;
  await workspace.save();

  return {
    sessionId,
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      tools: workspace.tools
    },
    startedBy: {
      userId,
      memberId: member._id
    }
  };
};

export const joinVideoCallService = async (userId, workspaceId) => {
  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if video call is active
  if (!workspace.tools.videoCall.sessionId) {
    throw new BadRequestException("No active video call in this workspace");
  }

  if (!workspace.tools.videoCall.active) {
    throw new BadRequestException("Video call is disabled for this workspace");
  }

  return {
    sessionId: workspace.tools.videoCall.sessionId,
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      tools: workspace.tools
    },
    joinedBy: {
      userId,
      memberId: member._id
    }
  };
};

export const endVideoCallService = async (userId, workspaceId) => {
  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if video call is active
  if (!workspace.tools.videoCall.sessionId) {
    throw new BadRequestException("No active video call to end");
  }

  // End video call
  const endedSessionId = workspace.tools.videoCall.sessionId;
  workspace.tools.videoCall.sessionId = null;
  await workspace.save();

  return {
    endedSessionId,
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      tools: workspace.tools
    },
    endedBy: {
      userId,
      memberId: member._id
    }
  };
};

export const getVideoCallStatusService = async (userId, workspaceId) => {
  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  return {
    isActive: !!workspace.tools.videoCall.sessionId,
    sessionId: workspace.tools.videoCall.sessionId,
    isEnabled: workspace.tools.videoCall.active,
    workspace: {
      _id: workspace._id,
      name: workspace.name,
    }
  };
};