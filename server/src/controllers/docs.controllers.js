import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { BadRequestException } from "../utils/app-error.js";
import UserModel from "../models/User.model.js";
import {
  createDocService,
  getDocByIdService,
  getWorkspaceDocsService,
  updateDocService,
  deleteDocService,
} from "../services/docs.service.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import { RolePermissions } from "../utils/role-permissions.js";
import { 
  createDocSchema, 
  docIdSchema, 
  updateDocSchema, 
} from "../validation/docs.validation.js";

import {workspaceIdSchema} from "../validation/workspace.validation.js"

//Socket IO instance (matching whiteboard pattern)
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
  console.log(' Socket.IO instance set for docs controller');
};

export const createDocController = asyncHandler(async (req, res) => {
  const body = createDocSchema.parse(req.body);
  const userId = req.user?._id;
  const currentUser = await UserModel.findById(userId).select('currentWorkspace');
  const workspaceId = currentUser.currentWorkspace;

  console.log(' Create document request:', {
    userId,
    workspaceId,
    body
  });

  //Check if user has a current workspace
  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Get user role and check permissions
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  console.log(' User role for creating document:', role);

  //Allow OWNER, ADMIN, and MEMBER to create documents (same as whiteboard for creation)
  try {
    roleGuard(role, [Permissions.EDIT_DOCS]);
    console.log(' Permission check passed for role:', role);
  } catch (error) {
    console.error(' Permission check failed:', error.message);
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to create documents",
      error: "Permission denied",
      userRole: role,
      requiredPermission: "EDIT_DOCS"
    });
  }

  //Pass workspaceId to the service
  const { doc } = await createDocService(userId, { 
    ...body, 
    workspaceId 
  });

  console.log(' Document created successfully:', doc._id);

  //Emit socket event (matching whiteboard pattern)
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('doc-created', {
      document: doc,
      createdBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Document created successfully",
    doc,
  });
});

export const getWorkspaceDocsController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  //Allow all workspace members to VIEW documents (matching whiteboard pattern)
  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('User role for viewing documents:', role);
    
    //As long as user has any role in workspace, they can view documents
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { docs } = await getWorkspaceDocsService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Documents fetched successfully",
      docs,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

export const getDocByIdController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  //Get document first, then check if user is a member (matching whiteboard pattern)
  const { doc } = await getDocByIdService(docId);

  //Allow all workspace members to VIEW documents
  try {
    const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
    console.log('User role for viewing document:', role);
    
    //As long as user has any role in workspace, they can view the document
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Document fetched successfully",
      doc,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

export const updateDocController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const body = updateDocSchema.parse(req.body);
  const userId = req.user?._id;

  console.log(' Update document request:', {
    docId,
    userId,
    body: { title: body.title?.substring(0, 30), contentLength: body.content?.length }
  });

  //Get document first to check workspace
  const { doc: existingDoc } = await getDocByIdService(docId);
  console.log(' Existing document:', {
    creatorId: existingDoc.creatorId._id || existingDoc.creatorId,
    workspaceId: existingDoc.workspaceId
  });

  //Check permissions for editing
  const { role } = await getMemberRoleInWorkspace(userId, existingDoc.workspaceId);
  console.log(' User role in workspace:', role);

  //Check if user is document owner
  const isDocumentOwner = existingDoc.creatorId._id ? 
    existingDoc.creatorId._id.toString() === userId.toString() : 
    existingDoc.creatorId.toString() === userId.toString();
  
  console.log(' Permission check:', {
    role,
    isDocumentOwner,
    userId,
    creatorId: existingDoc.creatorId._id || existingDoc.creatorId
  });

  //Enhanced permission logic
  let canEdit = false;
  let permissionReason = '';

  if (role === 'OWNER') {
    canEdit = true;
    permissionReason = 'workspace owner';
  } else if (role === 'ADMIN') {
    canEdit = true;
    permissionReason = 'workspace admin';
  } else if (isDocumentOwner) {
    canEdit = true;
    permissionReason = 'document owner';
  } else if (role === 'MEMBER') {
    canEdit = false;
    permissionReason = 'member without document ownership';
  } else {
    canEdit = false;
    permissionReason = 'not a workspace member';
  }

  console.log(' Final permission decision:', {
    canEdit,
    permissionReason,
    role,
    isDocumentOwner
  });

  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: `You do not have permission to edit this document (${permissionReason})`,
      error: "Permission denied",
      userRole: role,
      isDocumentOwner,
      permissionReason
    });
  }

  console.log(' Permission check passed, updating document');
  const { doc } = await updateDocService(docId, userId, body);

  //Emit socket event for real-time updates
  if (io) {
    io.to(`doc:${docId}`).emit('doc-updated', {
      documentId: docId,
      updates: body,
      updatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Document updated successfully",
    doc,
  });
});

export const deleteDocController = asyncHandler(async (req, res) => {
  const docId = docIdSchema.parse(req.params.id);
  const userId = req.user?._id;

  //Get document first to check workspace (matching whiteboard pattern)
  const { doc } = await getDocByIdService(docId);

  //Check permissions for deletion
  const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);

  //Check if user is document owner
  const isDocumentOwner = doc.creatorId._id ? 
    doc.creatorId._id.toString() === userId.toString() : 
    doc.creatorId.toString() === userId.toString();

  //Allow OWNER, ADMIN, or document owner to delete
  const canDelete = role === 'OWNER' || role === 'ADMIN' || isDocumentOwner;

  if (!canDelete) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to delete this document",
      error: "Permission denied",
      userRole: role,
      isDocumentOwner
    });
  }

  const result = await deleteDocService(docId, userId);

  //Emit socket event for deletion (matching whiteboard pattern)
  if (io) {
    io.to(`doc:${docId}`).emit('doc-deleted', {
      documentId: docId,
      deletedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Document deleted successfully",
    result,
  });
});

//FIX: New function name and implementation (matching whiteboard pattern exactly)
export const getUserRoleInWorkspaceController = asyncHandler(async (req, res) => {
  console.log('getUserRoleInWorkspaceController called with:', req.params);
  
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  console.log('Fetching role for userId:', userId, 'in workspace:', workspaceId);

  try {
    //Get user's role in the workspace (exactly like whiteboard)
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('Found role:', role, 'for user in workspace:', workspaceId);

    //Check if role was found
    if (!role) {
      console.error('No role found for user in workspace');
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    //Permission logic (matching whiteboard but allowing document owners to edit their own)
    const userPermissions = RolePermissions[role] || [];
    
    const permissions = {
      canEdit: userPermissions.includes(Permissions.EDIT_DOCS),
      canView: userPermissions.includes(Permissions.USE_DOCS),
      canCreate: userPermissions.includes(Permissions.EDIT_DOCS), // Same as edit for documents
      canDelete: userPermissions.includes(Permissions.EDIT_DOCS) // Same as edit for documents
    };

    const isWorkspaceOwner = role === 'OWNER';
    const isAdmin = role === 'ADMIN';

    console.log('Calculated permissions:', { 
      role,
      permissions,
      isWorkspaceOwner,
      isAdmin
    });

    //Return comprehensive response (exactly matching whiteboard pattern)
    return res.status(HTTPSTATUS.OK).json({
      message: "User role fetched successfully",
      role: role,
      isDocumentOwner: false, // Will be determined per document
      isWorkspaceOwner,
      isAdmin,
      workspace: {
        id: workspaceId
      },
      permissions
    });
  } catch (error) {
    console.error('Error fetching user role in workspace:', error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching user permissions",
      error: error.message
    });
  }
});