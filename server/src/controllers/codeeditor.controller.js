import { HTTPSTATUS } from "../config/http.config.js";
import { Permissions } from "../enums/role.enum.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getMemberRoleInWorkspace } from "../services/member.service.js";
import { BadRequestException } from "../utils/app-error.js";
import UserModel from "../models/User.model.js";
import {
  getCodeEditorByFileSystemIdService,
  getCodeEditorByIdService,
  getWorkspaceCodeEditorsService,
  updateCodeEditorService,
  createCodeEditorService,
  deleteCodeEditorService,
  saveCodeEditorContentService
} from "../services/codeeditor.service.js";
import { roleGuard } from "../utils/roleGuard.js";
import {
  codeEditorIdSchema,
  executeCodeSchema,
  updateCodeEditorSchema,
  createCodeEditorSchema,
  saveCodeEditorContentSchema
} from "../validation/codeeditor.validation.js";
import { fileSystemIdSchema } from "../validation/filesystem.validation.js";
import { workspaceIdSchema } from "../validation/workspace.validation.js";
import { executeCodeService } from "../services/codeExecutor.service.js";
import { getExecutionHistoryService } from "../services/codeExecutor.service.js";

//Socket IO instance management (matching docs pattern)
let io;
export const setSocketIO = (socketIO) => {
  io = socketIO;
  console.log(' Socket.IO instance set for code editor controller');
};

//Create new code editor (matching docs pattern)
export const createCodeEditorController = asyncHandler(async (req, res) => {
  const body = createCodeEditorSchema.parse(req.body);
  const userId = req.user?._id;
  const currentUser = await UserModel.findById(userId).select('currentWorkspace');
  const workspaceId = currentUser.currentWorkspace;

  //Check if user has a current workspace
  if (!workspaceId) {
    throw new BadRequestException("No current workspace found");
  }

  //Check permissions - all workspace members can create code editors
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  roleGuard(role, [Permissions.USE_CODE_EDITOR]); // Members can create code editors

  //Pass workspaceId to the service
  const { codeEditor } = await createCodeEditorService(userId, { 
    ...body, 
    workspaceId 
  });

  //Emit socket event (matching docs pattern)
  if (io) {
    io.to(`workspace:${workspaceId}`).emit('code-editor-created', {
      codeEditor: codeEditor,
      createdBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Code editor created successfully",
    codeEditor,
  });
});

//Get all code editors in workspace (matching docs pattern)
export const getWorkspaceCodeEditorsController = asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);
  const userId = req.user?._id;

  //Allow all workspace members to VIEW code editors (matching docs pattern)
  try {
    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    console.log('User role for viewing code editors:', role);
    
    //As long as user has any role in workspace, they can view code editors
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    const { codeEditors } = await getWorkspaceCodeEditorsService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Code editors fetched successfully",
      codeEditors,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Get code editor by ID (matching docs pattern)
export const getCodeEditorByIdController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const userId = req.user?._id;

  //Get code editor first, then check if user is a member (matching docs pattern)
  const { codeEditor } = await getCodeEditorByIdService(codeEditorId);

  //Allow all workspace members to VIEW code editors
  try {
    const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
    console.log('User role for viewing code editor:', role);
    
    //As long as user has any role in workspace, they can view the code editor
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Code editor fetched successfully",
      codeEditor,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Get code editor by file system ID (matching docs pattern)
export const getCodeEditorByFileSystemIdController = asyncHandler(async (req, res) => {
  const fileSystemId = fileSystemIdSchema.parse(req.params.fileSystemId);
  const userId = req.user?._id;

  //Get code editor first, then check permissions
  const { codeEditor } = await getCodeEditorByFileSystemIdService(fileSystemId);

  //Allow all workspace members to VIEW code editors
  try {
    const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
    console.log('User role for viewing code editor:', role);
    
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Code editor fetched successfully",
      codeEditor,
    });
  } catch (error) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "Access denied",
      error: error.message
    });
  }
});

//Update code editor (matching docs pattern)
export const updateCodeEditorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const body = updateCodeEditorSchema.parse(req.body);
  const userId = req.user?._id;

  //Get code editor first to check workspace (matching docs pattern)
  const { codeEditor: existingEditor } = await getCodeEditorByIdService(codeEditorId);

  //Check permissions - OWNER and ADMIN can edit, plus creator (matching docs)
  const { role } = await getMemberRoleInWorkspace(userId, existingEditor.workspaceId);
  
  //Check if user is code editor owner
  const isCodeEditorOwner = existingEditor.creatorId._id ? 
    existingEditor.creatorId._id.toString() === userId.toString() : 
    existingEditor.creatorId.toString() === userId.toString();

  //FIXED: Allow OWNER, ADMIN, or creator to edit (matching docs logic)
  const canEdit = role === 'OWNER' || role === 'ADMIN' || isCodeEditorOwner;
  
  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to edit this code editor",
      error: "Access denied"
    });
  }

  const { codeEditor } = await updateCodeEditorService(codeEditorId, userId, body);

  //Emit socket event for real-time updates (matching docs pattern)
  if (io) {
    io.to(`code-editor:${codeEditorId}`).emit('code-editor-updated', {
      codeEditorId: codeEditorId,
      updates: body,
      updatedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor updated successfully",
    codeEditor,
  });
});

//Save code editor content with proper permissions (matching docs)
export const saveCodeEditorContentController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const body = saveCodeEditorContentSchema.parse(req.body);
  const userId = req.user?._id;

  //Get code editor first to check workspace
  const { codeEditor: existingEditor } = await getCodeEditorByIdService(codeEditorId);

  //Check permissions - OWNER, ADMIN, or creator can save (matching docs)
  const { role } = await getMemberRoleInWorkspace(userId, existingEditor.workspaceId);
  
  const isCodeEditorOwner = existingEditor.creatorId._id ? 
    existingEditor.creatorId._id.toString() === userId.toString() : 
    existingEditor.creatorId.toString() === userId.toString();

  //FIXED: Allow OWNER, ADMIN, or creator (matching docs logic)
  const canEdit = role === 'OWNER' || role === 'ADMIN' || isCodeEditorOwner;
  
  if (!canEdit) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to save this code editor",
      error: "Access denied"
    });
  }

  const { codeEditor } = await saveCodeEditorContentService(codeEditorId, userId, body);

  //Emit socket event for real-time save notification
  if (io) {
    io.to(`code-editor:${codeEditorId}`).emit('code-editor-content-saved', {
      codeEditorId: codeEditorId,
      content: body,
      savedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor content saved successfully",
    codeEditor,
  });
});

//Execute code with proper permissions (all workspace members can execute)
//FIXED: Execute code controller (matching your original pattern)
export const executeCodeController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const body = executeCodeSchema.parse(req.body);
  const userId = req.user?._id;

  console.log(' Execute code request:', { 
    codeEditorId, 
    userId, 
    bodyKeys: Object.keys(body),
    language: body.language,
    hasCode: !!body.code
  });

  try {
    //Get code editor and check permissions
    const { codeEditor } = await getCodeEditorByIdService(codeEditorId);
    
    //Check workspace permissions (allow all workspace members)
    const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
    
    if (!role) {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    console.log(' User role in workspace:', role, '- execution allowed');

    //Execute the code with the full body object
    const { execution } = await executeCodeService(codeEditorId, userId, body);

    //Emit socket event for execution results
    if (io) {
      io.to(`code-editor:${codeEditorId}`).emit('code-editor-execution-result', {
        codeEditorId: codeEditorId,
        result: execution.output || execution.result,
        error: execution.error,
        executionTime: execution.executionTime,
        language: execution.language,
        input: execution.input || '',
        executedBy: {
          userId,
          userName: req.user?.name || req.user?.email
        },
        timestamp: new Date()
      });
    }

    console.log(" Execution successful, returning:", {
      id: execution._id,
      status: execution.status,
      outputLength: execution.output?.length || 0
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Code executed successfully",
      execution,
    });
  } catch (error) {
    console.error(' Execute code error:', error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Code execution failed",
      error: error.message
    });
  }
});

//Get execution history (matching docs pattern)
export const getExecutionHistoryController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const userId = req.user?._id;

  //Get code editor and check permissions
  const { codeEditor } = await getCodeEditorByIdService(codeEditorId);
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  //All workspace members can view execution history
  if (!role) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You are not a member of this workspace",
      error: "Access denied"
    });
  }

  const { executions } = await getExecutionHistoryService(codeEditorId, userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Execution history fetched successfully",
    executions,
  });
});

//Delete code editor (matching docs pattern)
export const deleteCodeEditorController = asyncHandler(async (req, res) => {
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const userId = req.user?._id;

  //Get code editor first to check workspace
  const { codeEditor } = await getCodeEditorByIdService(codeEditorId);

  //Check permissions - only creator or OWNER/ADMIN can delete
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  const isCodeEditorOwner = codeEditor.creatorId._id ? 
    codeEditor.creatorId._id.toString() === userId.toString() : 
    codeEditor.creatorId.toString() === userId.toString();

  const canDelete = role === 'OWNER' || role === 'ADMIN' || isCodeEditorOwner;
  
  if (!canDelete) {
    return res.status(HTTPSTATUS.FORBIDDEN).json({
      message: "You do not have permission to delete this code editor",
      error: "Access denied"
    });
  }

  const result = await deleteCodeEditorService(codeEditorId, userId);

  //Emit socket event for deletion
  if (io) {
    io.to(`code-editor:${codeEditorId}`).emit('code-editor-deleted', {
      codeEditorId: codeEditorId,
      deletedBy: {
        userId,
        userName: req.user?.name
      },
      timestamp: new Date()
    });
  }

  return res.status(HTTPSTATUS.OK).json({
    message: "Code editor deleted successfully",
    result,
  });
});

//Get user role in code editor (matching docs pattern)
export const getUserRoleInCodeEditorController = asyncHandler(async (req, res) => {
  console.log('getUserRoleInCodeEditorController called with:', req.params);
  
  const codeEditorId = codeEditorIdSchema.parse(req.params.codeEditorId);
  const userId = req.user?._id;

  console.log('Fetching role for userId:', userId, 'in code editor:', codeEditorId);

  try {
    //Get code editor first
    const { codeEditor } = await getCodeEditorByIdService(codeEditorId);
    
    console.log('Found code editor:', codeEditor.title || codeEditor.fileName, 'in workspace:', codeEditor.workspaceId);
    
    //Get user's role in the workspace
    const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
    console.log('Found role:', role, 'for user in workspace:', codeEditor.workspaceId);

    //Check if role was found
    if (!role) {
      console.error('No role found for user in workspace');
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "You are not a member of this workspace",
        error: "Access denied"
      });
    }

    //Check if user is code editor owner
    const isCodeEditorOwner = codeEditor.creatorId._id ? 
      codeEditor.creatorId._id.toString() === userId.toString() : 
      codeEditor.creatorId.toString() === userId.toString();
    
    console.log('Is code editor owner:', isCodeEditorOwner, 'creatorId:', codeEditor.creatorId, 'userId:', userId);

    const isWorkspaceOwner = role === 'OWNER';
    const isAdmin = role === 'ADMIN';
    const isMember = role === 'MEMBER';
    
    //FIXED: Permission logic - OWNER, ADMIN, or creator can edit (matching docs)
    const canEdit = isWorkspaceOwner || isAdmin || isCodeEditorOwner;
    const canView = true; // All workspace members can view
    const canCreate = isWorkspaceOwner || isAdmin || isMember; // All members can create
    const canDelete = isWorkspaceOwner || isAdmin || isCodeEditorOwner;
    const canExecute = true; // All workspace members can execute code

    console.log('Calculated permissions:', { 
      canEdit, 
      canView, 
      canCreate, 
      canDelete,
      canExecute,
      isWorkspaceOwner,
      isAdmin,
      isCodeEditorOwner,
      role 
    });

    //Return comprehensive response (matching docs pattern)
    return res.status(HTTPSTATUS.OK).json({
      message: "User role in code editor fetched successfully",
      role: role,
      isCodeEditorOwner,
      isWorkspaceOwner,
      isAdmin,
      codeEditor: {
        id: codeEditor._id,
        title: codeEditor.title || codeEditor.fileName,
        creatorId: codeEditor.creatorId,
        workspaceId: codeEditor.workspaceId,
        language: codeEditor.language
      },
      permissions: {
        canEdit,
        canView,
        canCreate,
        canDelete,
        canExecute
      }
    });
  } catch (error) {
    console.error('Error fetching user role in code editor:', error);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching user permissions",
      error: error.message
    });
  }
});