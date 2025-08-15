import mongoose from "mongoose";
import FileSystemModel from "../models/FileSystem.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import MemberModel from "../models/Member.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import { deleteChildrenRecursively, getLanguageFromExtension, updateChildrenPaths } from "../utils/filesystem.utils.js";

// ✅ Get file system item content service (new)
export const getFileSystemItemContentService = async (fileSystemId) => {
  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem || !fileSystemItem.isActive) {
    throw new NotFoundException("File system item not found");
  }

  if (fileSystemItem.type !== "file") {
    throw new BadRequestException("Only files have content");
  }

  // If file has associated code editor, get content from there
  if (fileSystemItem.codeEditorId) {
    const codeEditor = await CodeEditorModel.findById(fileSystemItem.codeEditorId);
    if (codeEditor && codeEditor.isActive) {
      return { 
        content: codeEditor.content,
        language: codeEditor.language,
        metadata: codeEditor.metadata
      };
    }
  }

  // Return empty content if no code editor
  return { 
    content: "",
    language: getLanguageFromExtension(fileSystemItem.metadata?.extension || ""),
    metadata: {
      lineCount: 0,
      characterCount: 0,
      lastSaved: fileSystemItem.updatedAt
    }
  };
};

// ✅ Update file system item content service (new)
export const updateFileSystemItemContentService = async (fileSystemId, userId, { content, language }) => {
  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem || !fileSystemItem.isActive) {
    throw new NotFoundException("File system item not found");
  }

  if (fileSystemItem.type !== "file") {
    throw new BadRequestException("Only files can have content updated");
  }

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId: fileSystemItem.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  // If file has associated code editor, update it
  if (fileSystemItem.codeEditorId) {
    const codeEditor = await CodeEditorModel.findById(fileSystemItem.codeEditorId);
    if (codeEditor && codeEditor.isActive) {
      if (content !== undefined) {
        codeEditor.content = content;
        codeEditor.metadata.lineCount = content.split('\n').length;
        codeEditor.metadata.characterCount = content.length;
      }
      
      if (language !== undefined) {
        codeEditor.language = language;
      }

      codeEditor.lastEditedBy = userId;
      codeEditor.metadata.lastSaved = new Date();

      await codeEditor.save();

      return { fileSystemItem: fileSystemItem };
    }
  }

  // If no code editor, create one
  const codeEditor = new CodeEditorModel({
    title: fileSystemItem.name,
    content: content || "",
    language: language || getLanguageFromExtension(fileSystemItem.metadata?.extension || ""),
    workspaceId: fileSystemItem.workspaceId,
    fileSystemId: fileSystemItem._id,
    creatorId: userId,
    roomId: `editor_${fileSystemItem._id}_${Date.now()}`,
    collaborators: [member._id],
    lastEditedBy: userId,
    metadata: {
      lineCount: (content || "").split('\n').length,
      characterCount: (content || "").length,
      lastSaved: new Date()
    }
  });

  await codeEditor.save();
  
  fileSystemItem.codeEditorId = codeEditor._id;
  await fileSystemItem.save();

  return { fileSystemItem: fileSystemItem };
};

// ✅ Get file system tree service (new)
export const getFileSystemTreeService = async (workspaceId) => {
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
    .sort({ path: 1 });

  // Build tree structure
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => {
        const itemParentId = item.parentId ? item.parentId.toString() : null;
        return itemParentId === parentId;
      })
      .map(item => ({
        ...item.toObject(),
        children: item.type === 'folder' ? buildTree(items, item._id.toString()) : []
      }));
  };

  const tree = buildTree(fileSystemItems);

  return { tree };
};

// ✅ Duplicate filesystem item service (new)
export const duplicateFileSystemItemService = async (fileSystemId, userId, { name, parentId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const originalItem = await FileSystemModel.findById(fileSystemId).session(session);
    if (!originalItem || !originalItem.isActive) {
      throw new NotFoundException("File system item not found");
    }

    // Check if user is a member of the workspace
    const member = await MemberModel.findOne({
      userId,
      workspaceId: originalItem.workspaceId,
    }).session(session);

    if (!member) {
      throw new BadRequestException("You are not a member of this workspace");
    }

    // Generate new path
    let newPath;
    const duplicateName = name || `${originalItem.name} (copy)`;
    
    if (parentId) {
      const parent = await FileSystemModel.findById(parentId).session(session);
      if (!parent) {
        throw new BadRequestException("Parent directory not found");
      }
      newPath = `${parent.path}/${duplicateName}`;
    } else {
      newPath = `/${duplicateName}`;
    }

    // Check for duplicate names
    const existingItem = await FileSystemModel.findOne({
      name: duplicateName,
      parentId: parentId || null,
      workspaceId: originalItem.workspaceId,
      isActive: true,
    }).session(session);

    if (existingItem) {
      throw new BadRequestException(`A ${originalItem.type} with this name already exists in this directory`);
    }

    // Create duplicate
    const roomPrefix = originalItem.type === 'file' ? 'file' : 'folder';
    const roomId = `${roomPrefix}_${new mongoose.Types.ObjectId()}_${Date.now()}`;

    const duplicateItem = new FileSystemModel({
      name: duplicateName,
      type: originalItem.type,
      path: newPath,
      parentId: parentId || null,
      workspaceId: originalItem.workspaceId,
      creatorId: userId,
      roomId,
      metadata: { ...originalItem.metadata },
    });

    await duplicateItem.save({ session });

    // If original is a file with code editor, duplicate it too
    if (originalItem.type === "file" && originalItem.codeEditorId) {
      const originalCodeEditor = await CodeEditorModel.findById(originalItem.codeEditorId).session(session);
      if (originalCodeEditor && originalCodeEditor.isActive) {
        const duplicateCodeEditor = new CodeEditorModel({
          title: duplicateName,
          content: originalCodeEditor.content,
          language: originalCodeEditor.language,
          workspaceId: originalItem.workspaceId,
          fileSystemId: duplicateItem._id,
          creatorId: userId,
          roomId: `editor_${duplicateItem._id}_${Date.now()}`,
          collaborators: [member._id],
          metadata: { ...originalCodeEditor.metadata }
        });

        await duplicateCodeEditor.save({ session });
        duplicateItem.codeEditorId = duplicateCodeEditor._id;
        await duplicateItem.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { fileSystemItem: duplicateItem };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ✅ Bulk delete filesystem items service (new)
export const bulkDeleteFileSystemItemsService = async (itemIds, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deletedItems = [];
    const failedItems = [];

    for (const itemId of itemIds) {
      try {
        const fileSystemItem = await FileSystemModel.findById(itemId).session(session);
        if (!fileSystemItem || !fileSystemItem.isActive) {
          failedItems.push({ itemId, reason: "Item not found" });
          continue;
        }

        // Check if user has permission to delete
        const member = await MemberModel.findOne({
          userId,
          workspaceId: fileSystemItem.workspaceId,
        }).session(session);

        const isCreator = fileSystemItem.creatorId.toString() === userId.toString();
        
        if (!isCreator && (!member || member.role === 'MEMBER')) {
          failedItems.push({ itemId, reason: "Permission denied" });
          continue;
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
          await deleteChildrenRecursively(itemId, session);
        }

        // Mark the item as inactive
        fileSystemItem.isActive = false;
        await fileSystemItem.save({ session });

        deletedItems.push(fileSystemItem);

      } catch (error) {
        failedItems.push({ itemId, reason: error.message });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      deletedItems,
      failedItems,
      totalProcessed: itemIds.length,
      totalDeleted: deletedItems.length,
      totalFailed: failedItems.length
    };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ✅ Get filesystem item history service (new)
export const getFileSystemItemHistoryService = async (fileSystemId) => {
  const fileSystemItem = await FileSystemModel.findById(fileSystemId);
  if (!fileSystemItem || !fileSystemItem.isActive) {
    throw new NotFoundException("File system item not found");
  }

  // For now, return basic history - you can expand this to track actual versions
  const history = [{
    version: 1,
    timestamp: fileSystemItem.createdAt,
    action: "created",
    user: fileSystemItem.creatorId,
    changes: {
      name: fileSystemItem.name,
      type: fileSystemItem.type,
      path: fileSystemItem.path
    }
  }];

  // If there's an associated code editor, get its update history
  if (fileSystemItem.type === "file" && fileSystemItem.codeEditorId) {
    const codeEditor = await CodeEditorModel.findById(fileSystemItem.codeEditorId)
      .populate("lastEditedBy", "name email profilePicture");
    
    if (codeEditor && codeEditor.isActive) {
      history.push({
        version: 2,
        timestamp: codeEditor.metadata.lastSaved || codeEditor.updatedAt,
        action: "content_updated",
        user: codeEditor.lastEditedBy,
        changes: {
          lineCount: codeEditor.metadata.lineCount,
          characterCount: codeEditor.metadata.characterCount,
          language: codeEditor.language
        }
      });
    }
  }

  return { history: history.sort((a, b) => b.timestamp - a.timestamp) };
};

// ✅ Existing services remain the same
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