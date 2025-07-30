import mongoose from "mongoose";
import FileSystemModel from "../models/FileSystem.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import MemberModel from "../models/Member.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import { deleteChildrenRecursively, getLanguageFromExtension, updateChildrenPaths } from "../utils/filesystem.utils.js";

export const createFileSystemItemService = async (userId, body) => {
  const { name, type, parentId, workspaceId } = body;
  let { path } = body;

  // Auto-generate path if not provided
  if (!path) {
    if (parentId) {
      const parent = await FileSystemModel.findById(parentId);
      if (!parent) {
        throw new BadRequestException("Parent directory not found");
      }
      path = `${parent.path}/${name}`;
    } else {
      // Root level item
      path = `/${name}`;
    }
  }

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
    throw new BadRequestException(
      `A ${type} with this name already exists in this directory`
    );
  }

  // Generate roomId
  const roomPrefix = type === 'file' ? 'file' : 'folder';
  const roomId = `${roomPrefix}_${new mongoose.Types.ObjectId()}_${Date.now()}`;

  const fileSystemItem = new FileSystemModel({
    name,
    type,
    path,
    parentId: parentId || null,
    workspaceId,
    creatorId: userId,
    roomId,
    metadata: {
      extension: type === "file" ? name.split(".").pop() || "" : "",
    },
  });

  await fileSystemItem.save();

  // Auto-create code editor for files
  if (type === "file") {
    const codeEditor = new CodeEditorModel({
      title: name,
      content: "",
      language: getLanguageFromExtension(name.split(".").pop() || ""),
      workspaceId,
      fileSystemId: fileSystemItem._id,
      creatorId: userId,
      roomId: `editor_${fileSystemItem._id}_${Date.now()}`, // Separate roomId for code editor
      collaborators: [member._id], // Add creator as collaborator
    });

    await codeEditor.save();
    fileSystemItem.codeEditorId = codeEditor._id;
    await fileSystemItem.save();
  }

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

export const updateFileSystemItemService = async (
  fileSystemId,
  userId,
  body
) => {
  const { name } = body;

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
      throw new BadRequestException(
        `A ${fileSystemItem.type} with this name already exists in this directory`
      );
    }

    fileSystemItem.name = name;

    // Auto-generate new path when name changes
    if (fileSystemItem.parentId) {
      const parent = await FileSystemModel.findById(fileSystemItem.parentId);
      if (!parent) {
        throw new BadRequestException("Parent directory not found");
      }
      fileSystemItem.path = `${parent.path}/${name}`;
    } else {
      // Root level item
      fileSystemItem.path = `/${name}`;
    }

    // Update extension for files
    if (fileSystemItem.type === "file") {
      fileSystemItem.metadata.extension = name.split(".").pop() || "";
    }

    // If this is a folder being renamed, update all children's paths
    if (fileSystemItem.type === "folder") {
      await updateChildrenPaths(fileSystemId, fileSystemItem.path);
    }
  }

  await fileSystemItem.save();

  return { fileSystemItem };
};

export const moveFileSystemItemService = async (fileSystemId, userId, body) => {
  const { newParentId } = body;

  // Ensure empty string or undefined becomes null
  if (newParentId === "" || newParentId === undefined) {
    newParentId = null;
  }

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

  // Verify new parent exists and is a folder (if provided)
  if (newParentId) {
    const newParent = await FileSystemModel.findById(newParentId);
    if (!newParent) {
      throw new BadRequestException("New parent directory not found");
    }
    if (newParent.type !== "folder") {
      throw new BadRequestException("New parent must be a folder");
    }
    if (newParent.workspaceId.toString() !== fileSystemItem.workspaceId.toString()) {
      throw new BadRequestException("Cannot move items between workspaces");
    }
  }

  // Check for duplicate names in new location
  const existingItem = await FileSystemModel.findOne({
    name: fileSystemItem.name,
    parentId: newParentId, // This will be null for root
    workspaceId: fileSystemItem.workspaceId,
    isActive: true,
    _id: { $ne: fileSystemId },
  });

  if (existingItem) {
    throw new BadRequestException(
      `A ${fileSystemItem.type} with this name already exists in the destination directory`
    );
  }

  // Auto-generate new path based on new parent
  let newPath;
  if (newParentId) {
    const newParent = await FileSystemModel.findById(newParentId);
    newPath = `${newParent.path}/${fileSystemItem.name}`;
  } else {
    // Moving to root
    newPath = `/${fileSystemItem.name}`;
  }

  // Update the item
  fileSystemItem.parentId = newParentId; // null for root
  fileSystemItem.path = newPath;

  // If moving a folder, update all children paths recursively
  if (fileSystemItem.type === "folder") {
    await updateChildrenPaths(fileSystemId, newPath);
  }

  await fileSystemItem.save();

  return { fileSystemItem };
};

export const deleteFileSystemItemService = async (fileSystemId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fileSystemItem = await FileSystemModel.findById(fileSystemId).session(
      session
    );
    if (!fileSystemItem) {
      throw new NotFoundException("File system item not found");
    }

    // Check if user is a member of the workspace
    const member = await MemberModel.findOne({
      userId,
      workspaceId: fileSystemItem.workspaceId,
    }).session(session);

    if (!member) {
      throw new BadRequestException(
        "You are not authorized to delete this item"
      );
    }

    // If it's a file with a code editor, delete the editor first
    if (fileSystemItem.type === "file" && fileSystemItem.codeEditorId) {
      await CodeEditorModel.findByIdAndUpdate(
        fileSystemItem.codeEditorId,
        { isActive: false },
        { session }
      );
    }

    // If it's a folder, recursively delete all children
    if (fileSystemItem.type === "folder") {
      await deleteChildrenRecursively(fileSystemId, session);
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


