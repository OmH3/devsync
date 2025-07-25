import mongoose from "mongoose";
import FileSystemModel from "../models/FileSystem.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import MemberModel from "../models/Member.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";

export const createFileSystemItemService = async (userId, body) => {
  const { name, type, path, parentId, workspaceId } = body;

  // Verify workspace exists
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

  // Check if parent exists (if provided)
  if (parentId) {
    const parent = await FileSystemModel.findById(parentId);
    if (!parent || parent.type !== "folder") {
      throw new BadRequestException("Invalid parent directory");
    }
  }

  // Check for duplicate names in the same directory
  const existingItem = await FileSystemModel.findOne({
    name,
    parentId: parentId || null,
    workspaceId,
    isActive: true,
  });

  if (existingItem) {
    throw new BadRequestException(`A ${type} with this name already exists in this directory`);
  }

  const fileSystemItem = new FileSystemModel({
    name,
    type,
    path,
    parentId: parentId || null,
    workspaceId,
    creatorId: userId,
    metadata: {
      extension: type === "file" ? name.split('.').pop() || "" : "",
    },
  });

  await fileSystemItem.save();

  return { fileSystemItem };
};

export const getWorkspaceFileSystemService = async (workspaceId) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const fileSystemItems = await FileSystemModel.find({
    workspaceId,
    isActive: true,
  })
    .populate("creatorId", "name email profilePicture")
    .populate("codeEditorId")
    .sort({ type: -1, name: 1 }); // Folders first, then files, alphabetically

  return { fileSystemItems };
};

export const getFileSystemItemByIdService = async (fileSystemId) => {
  const fileSystemItem = await FileSystemModel.findById(fileSystemId)
    .populate("creatorId", "name email profilePicture")
    .populate("codeEditorId");

  if (!fileSystemItem) {
    throw new NotFoundException("File system item not found");
  }

  return { fileSystemItem };
};

export const updateFileSystemItemService = async (fileSystemId, userId, body) => {
  const { name, path } = body;

  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem) {
    throw new NotFoundException("File system item not found");
  }

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId: fileSystemItem.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not authorized to edit this item");
  }

  // Check for duplicate names if renaming
  if (name && name !== fileSystemItem.name) {
    const existingItem = await FileSystemModel.findOne({
      name,
      parentId: fileSystemItem.parentId,
      workspaceId: fileSystemItem.workspaceId,
      isActive: true,
      _id: { $ne: fileSystemId },
    });

    if (existingItem) {
      throw new BadRequestException(`A ${fileSystemItem.type} with this name already exists in this directory`);
    }

    fileSystemItem.name = name;
    
    // Update extension for files
    if (fileSystemItem.type === "file") {
      fileSystemItem.metadata.extension = name.split('.').pop() || "";
    }
  }

  if (path) {
    fileSystemItem.path = path;
  }

  await fileSystemItem.save();

  return { fileSystemItem };
};

export const moveFileSystemItemService = async (fileSystemId, userId, body) => {
  const { newParentId, newPath } = body;

  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem) {
    throw new NotFoundException("File system item not found");
  }

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId: fileSystemItem.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not authorized to move this item");
  }

  // Verify new parent exists and is a folder
  if (newParentId) {
    const newParent = await FileSystemModel.findById(newParentId);
    if (!newParent || newParent.type !== "folder") {
      throw new BadRequestException("Invalid destination directory");
    }
  }

  // Check for duplicate names in new location
  const existingItem = await FileSystemModel.findOne({
    name: fileSystemItem.name,
    parentId: newParentId || null,
    workspaceId: fileSystemItem.workspaceId,
    isActive: true,
    _id: { $ne: fileSystemId },
  });

  if (existingItem) {
    throw new BadRequestException(`A ${fileSystemItem.type} with this name already exists in the destination directory`);
  }

  fileSystemItem.parentId = newParentId || null;
  fileSystemItem.path = newPath;

  await fileSystemItem.save();

  return { fileSystemItem };
};

export const deleteFileSystemItemService = async (fileSystemId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fileSystemItem = await FileSystemModel.findById(fileSystemId).session(session);
    if (!fileSystemItem) {
      throw new NotFoundException("File system item not found");
    }

    // Check if user is a member of the workspace
    const member = await MemberModel.findOne({
      userId,
      workspaceId: fileSystemItem.workspaceId,
    }).session(session);

    if (!member) {
      throw new BadRequestException("You are not authorized to delete this item");
    }

    // If it's a folder, recursively delete all children
    if (fileSystemItem.type === "folder") {
      await deleteChildrenRecursively(fileSystemId, session);
    }

    // If it's a file with a code editor, delete the code editor too
    if (fileSystemItem.type === "file" && fileSystemItem.codeEditorId) {
      await CodeEditorModel.findByIdAndUpdate(
        fileSystemItem.codeEditorId,
        { isActive: false },
        { session }
      );
    }

    // Mark the item as inactive instead of deleting
    fileSystemItem.isActive = false;
    await fileSystemItem.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { message: "File system item deleted successfully" };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Helper function to recursively delete children
const deleteChildrenRecursively = async (parentId, session) => {
  const children = await FileSystemModel.find({
    parentId,
    isActive: true,
  }).session(session);

  for (const child of children) {
    if (child.type === "folder") {
      await deleteChildrenRecursively(child._id, session);
    } else if (child.codeEditorId) {
      await CodeEditorModel.findByIdAndUpdate(
        child.codeEditorId,
        { isActive: false },
        { session }
      );
    }
    child.isActive = false;
    await child.save({ session });
  }
};