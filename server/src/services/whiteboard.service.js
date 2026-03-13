import WhiteboardModel from "../models/Whiteboard.model.js";
import MemberModel from "../models/Member.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import { v4 as uuidv4 } from "uuid";

export const createWhiteboardService = async (userId, body) => {
  const { boardTitle, boardDescription = "", workspaceId } = body;

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({ 
    userId, 
    workspaceId 
  }).populate("workspaceId");

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  // Create whiteboard with only the creator as initial collaborator
  const whiteboard = new WhiteboardModel({
    boardTitle,
    boardDescription,
    creatorId: userId,
    workspaceId,
    roomId: `whiteboard_${uuidv4()}_${Date.now()}`,
    collaborators: [member._id], //Only creator initially
    boardElements: [],
    lastEditedBy: userId,
  });

  await whiteboard.save();

  // Populate for response
  await whiteboard.populate([
    { path: "creatorId", select: "name email profilePicture" },
    { path: "lastEditedBy", select: "name email profilePicture" },
    {
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    },
  ]);

  return { whiteboard };
};

export const getWorkspaceWhiteboardsService = async (workspaceId, userId) => {
  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const whiteboards = await WhiteboardModel.find({
    workspaceId,
    isActive: true,
  })
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate({
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    })
    .sort({ updatedAt: -1 });

  return { whiteboards };
};

export const getWhiteboardByIdService = async (whiteboardId, userId) => {
  const whiteboard = await WhiteboardModel.findById(whiteboardId)
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate({
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    });

  if (!whiteboard || !whiteboard.isActive) {
    throw new NotFoundException("Whiteboard not found");
  }

  // Check if user has access to this whiteboard
  const member = await MemberModel.findOne({
    userId,
    workspaceId: whiteboard.workspaceId._id || whiteboard.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You don't have access to this whiteboard");
  }

  return { whiteboard };
};

export const updateWhiteboardService = async (whiteboardId, userId, body) => {
  const { boardTitle, boardDescription, boardElements } = body;

  const whiteboard = await WhiteboardModel.findById(whiteboardId);
  if (!whiteboard || !whiteboard.isActive) {
    throw new NotFoundException("Whiteboard not found");
  }

  //FIX: Check user's workspace role first
  const member = await MemberModel.findOne({
    userId,
    workspaceId: whiteboard.workspaceId,
  }).populate('role'); //Populate role to check permissions

  if (!member) {
    throw new BadRequestException("You don't have access to this whiteboard");
  }

  //Check permissions based on workspace role
  const isCreator = whiteboard.creatorId.toString() === userId.toString();
  const isCollaborator = whiteboard.collaborators.some(
    collaboratorId => collaboratorId.toString() === member._id.toString()
  );
  
  //ADMIN and OWNER roles can edit any whiteboard in their workspace
  const userRole = member.role?.name;
  const canEditByRole = userRole === 'OWNER' || userRole === 'ADMIN';

  console.log('Update whiteboard permissions check:', {
    userId: userId.toString(),
    whiteboardId,
    userRole,
    isCreator,
    isCollaborator,
    canEditByRole
  });

  //Allow editing if user is creator, collaborator, or has ADMIN/OWNER role
  if (!isCreator && !isCollaborator && !canEditByRole) {
    throw new BadRequestException("You are not authorized to edit this whiteboard");
  }

  // Update fields
  if (boardTitle !== undefined) whiteboard.boardTitle = boardTitle;
  if (boardDescription !== undefined) whiteboard.boardDescription = boardDescription;
  
  if (boardElements !== undefined) {
    whiteboard.boardElements = boardElements;
    whiteboard.metadata.elementCount = boardElements.length;
  }

  whiteboard.lastEditedBy = userId;
  whiteboard.metadata.lastSaved = new Date();

  await whiteboard.save();

  // Populate for response
  await whiteboard.populate([
    { path: "creatorId", select: "name email profilePicture" },
    { path: "lastEditedBy", select: "name email profilePicture" },
    {
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    },
  ]);

  return { whiteboard };
};

export const deleteWhiteboardService = async (whiteboardId, userId) => {
  const whiteboard = await WhiteboardModel.findById(whiteboardId);
  if (!whiteboard || !whiteboard.isActive) {
    throw new NotFoundException("Whiteboard not found");
  }

  //FIX: Check workspace role for deletion permissions
  const member = await MemberModel.findOne({
    userId,
    workspaceId: whiteboard.workspaceId,
  }).populate('role'); //Populate role

  if (!member) {
    throw new BadRequestException("You don't have access to this whiteboard");
  }

  const isCreator = whiteboard.creatorId.toString() === userId.toString();
  const userRole = member.role?.name;
  const canDeleteByRole = userRole === 'OWNER' || userRole === 'ADMIN';

  console.log('Delete whiteboard permissions check:', {
    userId: userId.toString(),
    whiteboardId,
    userRole,
    isCreator,
    canDeleteByRole
  });

  //Allow deletion if user is creator or has ADMIN/OWNER role
  if (!isCreator && !canDeleteByRole) {
    throw new BadRequestException("You are not authorized to delete this whiteboard");
  }

  // Soft delete
  whiteboard.isActive = false;
  await whiteboard.save();

  return { whiteboard };
};