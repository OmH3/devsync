import { v4 as uuidv4 } from 'uuid';
import CodeEditorModel from "../models/CodeEditor.model.js";
import FileSystemModel from "../models/FileSystem.model.js";
import MemberModel from "../models/Member.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";

export const getWorkspaceCodeEditorsService = async (workspaceId) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const codeEditors = await CodeEditorModel.find({
    workspaceId,
    isActive: true,
  })
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate("fileSystemId", "name path type")
    .sort({ updatedAt: -1 });

  return { codeEditors };
};

export const getCodeEditorByIdService = async (codeEditorId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId)
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate("fileSystemId", "name path type")
    .populate({
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    });

  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  return { codeEditor };
};

export const getCodeEditorByFileSystemIdService = async (fileSystemId) => {
  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem) {
    throw new NotFoundException("File system item not found");
  }

  if (!fileSystemItem.codeEditorId) {
    throw new NotFoundException("No code editor associated with this file");
  }

  const codeEditor = await CodeEditorModel.findById(fileSystemItem.codeEditorId)
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate("fileSystemId", "name path type")
    .populate({
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    });

  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  return { codeEditor };
};

export const updateCodeEditorService = async (codeEditorId, userId, body) => {
  const { title, content, language } = body;

  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // Check if user is a collaborator
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!member || !codeEditor.collaborators.includes(member._id)) {
    throw new BadRequestException("You are not authorized to edit this code editor");
  }

  if (title !== undefined) codeEditor.title = title;

  if (language !== undefined) codeEditor.language = language;
  
  if (content !== undefined) {
    codeEditor.content = content;
    codeEditor.metadata.lineCount = content.split('\n').length;
    codeEditor.metadata.characterCount = content.length;
  }

  codeEditor.lastEditedBy = userId;
  codeEditor.metadata.lastSaved = new Date();

  await codeEditor.save();

  return { codeEditor };
};

export const deleteCodeEditorService = async (codeEditorId, userId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // Check if user is the creator or has permission
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  }).populate("role");

  const isCreator = codeEditor.creatorId.toString() === userId.toString();

  if (!isCreator && !member) {
    throw new BadRequestException("You are not authorized to delete this code editor");
  }

  // Mark as inactive instead of deleting
  codeEditor.isActive = false;
  await codeEditor.save();

  // Update file system item to remove reference
  await FileSystemModel.findByIdAndUpdate(
    codeEditor.fileSystemId,
    { codeEditorId: null }
  );

  return { message: "Code editor deleted successfully" };
};

export const addCollaboratorService = async (codeEditorId, userId, collaboratorUserId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // Check if user has permission to add collaborators
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not authorized to modify this code editor");
  }

  // Find the collaborator member
  const collaboratorMember = await MemberModel.findOne({
    userId: collaboratorUserId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!collaboratorMember) {
    throw new BadRequestException("User is not a member of this workspace");
  }

  // Check if already a collaborator
  if (codeEditor.collaborators.includes(collaboratorMember._id)) {
    throw new BadRequestException("User is already a collaborator");
  }

  codeEditor.collaborators.push(collaboratorMember._id);
  await codeEditor.save();

  return { codeEditor };
};

export const removeCollaboratorService = async (codeEditorId, userId, collaboratorUserId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // Check if user has permission to remove collaborators
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not authorized to modify this code editor");
  }

  // Find the collaborator member
  const collaboratorMember = await MemberModel.findOne({
    userId: collaboratorUserId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!collaboratorMember) {
    throw new BadRequestException("User is not a member of this workspace");
  }

  // Remove collaborator
  codeEditor.collaborators = codeEditor.collaborators.filter(
    (collabId) => !collabId.equals(collaboratorMember._id)
  );

  await codeEditor.save();

  return { codeEditor };
};