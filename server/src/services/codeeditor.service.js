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