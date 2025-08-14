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
import { 
  createDocSchema, 
  docIdSchema, 
  updateDocSchema, 
} from "../validation/docs.validation.js";

import {workspaceIdSchema} from "../validation/workspace.validation.js"

// ✅ Socket IO instance (matching whiteboard pattern)
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
  console.log('✅ Socket.IO instance set for docs controller');
};

export const createDocController = asyncHandler(async (req, res) => {
  const body = createDocSchema.parse(req.body);
  const userId = req.user?._id;
  const currentUser = await UserModel.findById(userId).select('currentWorkspace');
  const workspaceId = currentUser.currentWorkspace;

  // ✅ Check if user has a current workspace
  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  // ✅ Only OWNER and ADMIN can create documents (matching whiteboard pattern)
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.EDIT_DOCS]); // Changed from USE_DOCS

  // ✅ Pass workspaceId to the service
  const { doc } = await createDocService(userId, { 
    ...body, 
    workspaceId 
  });

  // ✅ Emit socket event (matching whiteboard pattern)
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

  // ✅ Allow all workspace members to VIEW documents (matching whiteboard pattern)
  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('User role for viewing documents:', role);
    
    // ✅ As long as user has any role in workspace, they can view documents
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

  // ✅ Get document first, then check if user is a member (matching whiteboard pattern)
  const { doc } = await getDocByIdService(docId);

  // ✅ Allow all workspace members to VIEW documents
  try {
    const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
    console.log('User role for viewing document:', role);
    
    // ✅ As long as user has any role in workspace, they can view the document
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

  // ✅ Get document first to check workspace (matching whiteboard pattern)
  const { doc: existingDoc } = await getDocByIdService(docId);

  // ✅ Only OWNER and ADMIN can edit documents
  const { role } = await getMemberRoleInWorkspace(
    userId,
    existingDoc.workspaceId
  );
  roleGuard(role, [Permissions.EDIT_DOCS]);

  const { doc } = await updateDocService(docId, userId, body);

  // ✅ Emit socket event for real-time updates (matching whiteboard pattern)
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

  // ✅ Get document first to check workspace (matching whiteboard pattern)
  const { doc } = await getDocByIdService(docId);

  // ✅ Only OWNER and ADMIN can delete documents
  const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
  roleGuard(role, [Permissions.EDIT_DOCS]);

  const result = await deleteDocService(docId, userId);

  // ✅ Emit socket event for deletion (matching whiteboard pattern)
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

// ✅ Fixed function name and implementation (matching whiteboard pattern)
export const getUserRoleInDocumentController = asyncHandler(async (req, res) => {
  console.log('getUserRoleInDocumentController called with:', req.params);
  
  const docId = docIdSchema.parse(req.params.docId);
  const userId = req.user?._id;

  console.log('Fetching role for userId:', userId, 'in document:', docId);

  try {
    // ✅ Get document first
    const { doc } = await getDocByIdService(docId);
    
    console.log('Found document:', doc.title, 'in workspace:', doc.workspaceId);
    
    // ✅ Get user's role in the workspace
    const { role } = await getMemberRoleInWorkspace(userId, doc.workspaceId);
    console.log('Found role:', role, 'for user in workspace:', doc.workspaceId);

    // ✅ Check if role was found
    if (!role) {
      console.error('No role found for user in workspace');
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    // ✅ Check if user is document owner
    const isDocumentOwner = doc.creatorId._id ? 
      doc.creatorId._id.toString() === userId.toString() : 
      doc.creatorId.toString() === userId.toString();
    
    console.log('Is document owner:', isDocumentOwner, 'creatorId:', doc.creatorId, 'userId:', userId);

    const isWorkspaceOwner = role === 'OWNER';
    const isAdmin = role === 'ADMIN';
    const isMember = role === 'MEMBER';
    
    // ✅ Permission logic (matching whiteboard but allowing document owners to edit)
    const canEdit = isWorkspaceOwner || isAdmin || isDocumentOwner;
    const canView = true; // All workspace members can view
    const canCreate = isWorkspaceOwner || isAdmin || isMember;
    const canDelete = isWorkspaceOwner || isAdmin || isDocumentOwner;

    console.log('Calculated permissions:', { 
      canEdit, 
      canView, 
      canCreate, 
      canDelete,
      isWorkspaceOwner,
      isAdmin,
      isDocumentOwner,
      role 
    });

    // ✅ Return comprehensive response (matching whiteboard pattern)
    return res.status(HTTPSTATUS.OK).json({
      message: "User role in document fetched successfully",
      role: role,
      isDocumentOwner,
      isWorkspaceOwner,
      isAdmin,
      document: {
        id: doc._id,
        title: doc.title,
        creatorId: doc.creatorId,
        workspaceId: doc.workspaceId
      },
      permissions: {
        canEdit,
        canView,
        canCreate,
        canDelete
      }
    });
  } catch (error) {
    console.error('Error fetching user role in document:', error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching user permissions",
      error: error.message
    });
  }
});