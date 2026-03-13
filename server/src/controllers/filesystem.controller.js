import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import { BadRequestException } from "../utils/app-error.js";
import UserModel from "../models/User.model.js";
import {
  createFileSystemItemService,
  deleteFileSystemItemService,
  getFileSystemItemByIdService,
  getWorkspaceFileSystemService,
  moveFileSystemItemService,
  updateFileSystemItemService,
  getFileSystemItemContentService,
  updateFileSystemItemContentService,
  getFileSystemTreeService,
  duplicateFileSystemItemService,
  bulkDeleteFileSystemItemsService,
  getFileSystemItemHistoryService
} from "../services/filesystem.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  createFileSystemItemSchema,
  fileSystemIdSchema,
  moveFileSystemItemSchema,
  updateFileSystemItemSchema,
  updateFileSystemContentSchema,
  duplicateFileSystemItemSchema,
  bulkDeleteSchema
} from "../validation/filesystem.validation.js";
import { workspaceIdSchema } from "../validation/workspace.validation.js";

//Socket IO instance management (matching docs pattern)
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
  console.log(' Socket.IO instance set for filesystem controller');
};

//Create filesystem item (matching docs pattern)
export const createFileSystemItemController = asyncHandler(async (req, res) => {
  const body = createFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;
  const currentUser = await UserModel.findById(userId).select('currentWorkspace');
  const workspaceId = currentUser.currentWorkspace;

  //Check if user has a current workspace
  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check permissions - all workspace members can create files/folders
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.USE_CODE_EDITOR]); // Members can create filesystem items

  const dataWithWorkspace = {
    ...body,
    workspaceId
  };

  const { fileSystemItem } = await createFileSystemItemService(userId, dataWithWorkspace);

  //Emit socket event (matching docs pattern)
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('filesystem-item-created', {
      fileSystemItem: fileSystemItem,
      createdBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.CREATED).json({
    message: "File system item created successfully",
    fileSystemItem,
  });
});

//Get workspace filesystem (matching docs pattern)
export const getWorkspaceFileSystemController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  //Allow all workspace members to VIEW filesystem (matching docs pattern)
  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('User role for viewing filesystem:', role);
    
    //As long as user has any role in workspace, they can view filesystem
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { fileSystemItems } = await getWorkspaceFileSystemService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "File system items fetched successfully",
      fileSystemItems,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Get filesystem tree structure
export const getFileSystemTreeController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { tree } = await getFileSystemTreeService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "File system tree fetched successfully",
      tree,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Get filesystem item by ID (matching docs pattern)
export const getFileSystemItemByIdController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  //Get filesystem item first, then check if user is a member (matching docs pattern)
  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  //Allow all workspace members to VIEW filesystem items
  try {
    const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
    console.log('User role for viewing filesystem item:', role);
    
    //As long as user has any role in workspace, they can view the item
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "File system item fetched successfully",
      fileSystemItem,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Get file content
export const getFileSystemItemContentController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  try {
    const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
    
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { content } = await getFileSystemItemContentService(fileSystemId);

    return res.status(HTTPSTATUS.OK).json({
      message: "File content fetched successfully",
      content,
      fileSystemItem
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Update filesystem item (matching docs pattern)
export const updateFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = updateFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  //Get filesystem item first to check workspace (matching docs pattern)
  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  //Check permissions - creator or OWNER/ADMIN can edit
  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  
  //Check if user is item owner
  const isItemOwner = existingItem.creatorId._id ? 
    existingItem.creatorId._id.toString() === userId.toString() : 
    existingItem.creatorId.toString() === userId.toString();

  //Allow owner, admin, or creator to edit
  const canEdit = role === 'OWNER' || role === 'ADMIN' || isItemOwner;
  
  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to edit this item",
      error: "Access denied"
    });
  }

  const { fileSystemItem } = await updateFileSystemItemService(fileSystemId, userId, body);

  //Emit socket event for real-time updates
  if (io) {
    io.to(`filesystem:${fileSystemId}`).emit('filesystem-item-updated', {
      fileSystemId: fileSystemId,
      updates: body,
      updatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item updated successfully",
    fileSystemItem,
  });
});

//Update file content (new endpoint for real-time collaboration)
export const updateFileSystemItemContentController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = updateFileSystemContentSchema.parse(req.body);
  const userId = req.user?._id;

  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  //Check permissions - creator or OWNER/ADMIN can edit content
  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  
  const isItemOwner = existingItem.creatorId._id ? 
    existingItem.creatorId._id.toString() === userId.toString() : 
    existingItem.creatorId.toString() === userId.toString();

  const canEdit = role === 'OWNER' || role === 'ADMIN' || isItemOwner;
  
  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to edit this file",
      error: "Access denied"
    });
  }

  const { fileSystemItem } = await updateFileSystemItemContentService(fileSystemId, userId, body);

  //Emit socket event for real-time content updates
  if (io) {
    io.to(`filesystem:${fileSystemId}`).emit('filesystem-content-updated', {
      fileSystemId: fileSystemId,
      content: body.content,
      updatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File content updated successfully",
    fileSystemItem,
  });
});

//Move filesystem item (matching docs pattern)
export const moveFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = moveFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  //Check permissions
  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  
  const isItemOwner = existingItem.creatorId._id ? 
    existingItem.creatorId._id.toString() === userId.toString() : 
    existingItem.creatorId.toString() === userId.toString();

  const canEdit = role === 'OWNER' || role === 'ADMIN' || isItemOwner;
  
  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to move this item",
      error: "Access denied"
    });
  }

  const { fileSystemItem } = await moveFileSystemItemService(fileSystemId, userId, body);

  //Emit socket event for move operation
  if (io) {
    io.to(`workspace:${existingItem.workspaceId}`).emit('filesystem-item-moved', {
      fileSystemId: fileSystemId,
      oldPath: existingItem.path,
      newPath: body.newPath,
      movedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item moved successfully",
    fileSystemItem,
  });
});

//Duplicate filesystem item
export const duplicateFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const body = duplicateFileSystemItemSchema.parse(req.body);
  const userId = req.user?._id;

  const { fileSystemItem: existingItem } = await getFileSystemItemByIdService(fileSystemId);

  //Check permissions - all workspace members can duplicate
  const { role } = await getMemberRoleInWorkspace(userId, existingItem.workspaceId);
  
  if (!role) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You are not a member of this workspace",
      error: "Access denied"
    });
  }

  const { fileSystemItem } = await duplicateFileSystemItemService(fileSystemId, userId, body);

  //Emit socket event
  if (io) {
    io.to(`workspace:${existingItem.workspaceId}`).emit('filesystem-item-duplicated', {
      originalId: fileSystemId,
      duplicatedItem: fileSystemItem,
      duplicatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item duplicated successfully",
    fileSystemItem,
  });
});

//Get filesystem item history
export const getFileSystemItemHistoryController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  try {
    const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
    
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { history } = await getFileSystemItemHistoryService(fileSystemId);

    return res.status(HTTPSTATUS.OK).json({
      message: "File system item history fetched successfully",
      history,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Bulk delete filesystem items
export const bulkDeleteFileSystemItemsController = asyncHandler(async (req, res) => {
  const body = bulkDeleteSchema.parse(req.body);
  const userId = req.user?._id;

  //Check permissions for each item (this will be handled in the service)
  const result = await bulkDeleteFileSystemItemsService(body.itemIds, userId);

  //Emit socket events for bulk deletion
  if (io && result.success) {
    result.deletedItems.forEach(item => {
      io.to(`workspace:${item.workspaceId}`).emit('filesystem-item-deleted', {
        fileSystemId: item._id,
        deletedBy: {
          userId,
          userName: req.user?.name
        },
        timestamp: new Date()
      });
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File system items deleted successfully",
    result,
  });
});

//Delete filesystem item (matching docs pattern)
export const deleteFileSystemItemController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  //Get filesystem item first to check workspace
  const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);

  //Check permissions - only creator or OWNER/ADMIN can delete
  const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
  
  const isItemOwner = fileSystemItem.creatorId._id ? 
    fileSystemItem.creatorId._id.toString() === userId.toString() : 
    fileSystemItem.creatorId.toString() === userId.toString();

  const canDelete = role === 'OWNER' || role === 'ADMIN' || isItemOwner;
  
  if (!canDelete) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to delete this item",
      error: "Access denied"
    });
  }

  const result = await deleteFileSystemItemService(fileSystemId, userId);

  //Emit socket event for deletion
  if (io) {
    io.to(`filesystem:${fileSystemId}`).emit('filesystem-item-deleted', {
      fileSystemId: fileSystemId,
      deletedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "File system item deleted successfully",
    result,
  });
});

//Get user role in filesystem item (matching docs pattern)
export const getUserRoleInFileSystemController = asyncHandler(async (req, res) => {
  console.log('getUserRoleInFileSystemController called with:', req.params);
  
  const fileSystemId = fileSystemIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  console.log('Fetching role for userId:', userId, 'in filesystem item:', fileSystemId);

  try {
    //Get filesystem item first
    const { fileSystemItem } = await getFileSystemItemByIdService(fileSystemId);
    
    console.log('Found filesystem item:', fileSystemItem.name, 'in workspace:', fileSystemItem.workspaceId);
    
    //Get user's role in the workspace
    const { role } = await getMemberRoleInWorkspace(userId, fileSystemItem.workspaceId);
    console.log('Found role:', role, 'for user in workspace:', fileSystemItem.workspaceId);

    //Check if role was found
    if (!role) {
      console.error('No role found for user in workspace');
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    //Check if user is filesystem item owner
    const isItemOwner = fileSystemItem.creatorId._id ? 
      fileSystemItem.creatorId._id.toString() === userId.toString() : 
      fileSystemItem.creatorId.toString() === userId.toString();
    
    console.log('Is filesystem item owner:', isItemOwner, 'creatorId:', fileSystemItem.creatorId, 'userId:', userId);

    const isWorkspaceOwner = role === 'OWNER';
    const isAdmin = role === 'ADMIN';
    const isMember = role === 'MEMBER';
    
    //Permission logic - allowing item owners to edit their own files
    const canEdit = isWorkspaceOwner || isAdmin || isItemOwner;
    const canView = true; // All workspace members can view
    const canCreate = isWorkspaceOwner || isAdmin || isMember; // All members can create
    const canDelete = isWorkspaceOwner || isAdmin || isItemOwner;
    const canMove = isWorkspaceOwner || isAdmin || isItemOwner;

    console.log('Calculated permissions:', { 
      canEdit, 
      canView, 
      canCreate, 
      canDelete,
      canMove,
      isWorkspaceOwner,
      isAdmin,
      isItemOwner,
      role 
    });

    //Return comprehensive response (matching docs pattern)
    return res.status(HTTPSTATUS.OK).json({
      message: "User role in filesystem item fetched successfully",
      role: role,
      isItemOwner,
      isWorkspaceOwner,
      isAdmin,
      fileSystemItem: {
        id: fileSystemItem._id,
        name: fileSystemItem.name,
        type: fileSystemItem.type,
        creatorId: fileSystemItem.creatorId,
        workspaceId: fileSystemItem.workspaceId
      },
      permissions: {
        canEdit,
        canView,
        canCreate,
        canDelete,
        canMove
      }
    });
  } catch (error) {
    console.error('Error fetching user role in filesystem item:', error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching user permissions",
      error: error.message
    });
  }
});