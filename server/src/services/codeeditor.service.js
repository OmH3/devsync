import { v4 as uuidv4 } from 'uuid';
import CodeEditorModel from "../models/CodeEditor.model.js";
import FileSystemModel from "../models/FileSystem.model.js";
import MemberModel from "../models/Member.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import { getMemberRoleInWorkspace } from "./member.service.js";

//Create new code editor service (matching docs pattern)
export const createCodeEditorService = async (userId, { title, content = "", language = "javascript", workspaceId, fileSystemId }) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const roomId = uuidv4();

  const codeEditor = new CodeEditorModel({
    title: title || "Untitled Code Editor",
    content: content || "",
    language: language || "javascript",
    creatorId: userId,
    roomId,
    workspaceId,
    fileSystemId: fileSystemId || null,
    collaborators: [member._id],
    lastEditedBy: userId,
    metadata: {
      lineCount: content.split('\n').length,
      characterCount: content.length,
      lastSaved: new Date()
    }
  });

  await codeEditor.save();

  return { codeEditor };
};

//FIXED: Save code editor content service (proper permission logic)
export const saveCodeEditorContentService = async (codeEditorId, userId, { title, content, language }) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  //FIXED: Use workspace role-based permissions (matching docs pattern)
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Check if user is code editor owner
  const isCodeEditorOwner = codeEditor.creatorId.toString() === userId.toString();

  //FIXED: Allow OWNER, ADMIN, or creator to save (matching controller logic)
  const canEdit = role === 'OWNER' || role === 'ADMIN' || isCodeEditorOwner;
  
  if (!canEdit) {
    throw new BadRequestException("You do not have permission to save this code editor");
  }

  //Update content
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

//Delete code editor service (matching docs pattern)
export const deleteCodeEditorService = async (codeEditorId, userId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  //FIXED: Use workspace role-based permissions
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const isCreator = codeEditor.creatorId.toString() === userId.toString();
  
  //FIXED: Allow OWNER, ADMIN, or creator to delete
  const canDelete = role === 'OWNER' || role === 'ADMIN' || isCreator;
  
  if (!canDelete) {
    throw new BadRequestException("You are not authorized to delete this code editor");
  }

  // Soft delete
  codeEditor.isActive = false;
  await codeEditor.save();

  // If associated with filesystem, also mark filesystem item as inactive
  if (codeEditor.fileSystemId) {
    await FileSystemModel.findByIdAndUpdate(
      codeEditor.fileSystemId,
      { isActive: false }
    );
  }

  return { message: "Code editor deleted successfully" };
};

//Existing services remain the same
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

//FIXED: Update code editor service (proper permission logic)
export const updateCodeEditorService = async (codeEditorId, userId, body) => {
  const { title, content, language } = body;

  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  //FIXED: Use workspace role-based permissions (matching docs pattern)
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  //Check if user is code editor owner
  const isCodeEditorOwner = codeEditor.creatorId.toString() === userId.toString();

  //FIXED: Allow OWNER, ADMIN, or creator to edit (matching controller logic)
  const canEdit = role === 'OWNER' || role === 'ADMIN' || isCodeEditorOwner;
  
  if (!canEdit) {
    throw new BadRequestException("You do not have permission to edit this code editor");
  }

  //Update content
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