import fs from "fs/promises";
import CodeExecutionModel from "../models/CodeExecution.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import MemberModel from "../models/Member.model.js";
import { executeByLanguage } from "../coderunners/scripts.runner.js";
import { getMemberRoleInWorkspace } from "./member.service.js";

// ✅ FIXED: Execute code service with proper workspace permissions
export const executeCodeService = async (codeEditorId, userId, body) => {
  // ✅ Extract parameters correctly (matching your original structure)
  const { code, input = "", language, saveBeforeExecution = true } = body;

  // Get code editor
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // ✅ FIXED: Use workspace role-based permissions (allows ADMIN)
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  // ✅ Get member for additional checks if needed
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("Member record not found");
  }

  const isCreator = codeEditor.creatorId.toString() === userId.toString();
  const isCollaborator = codeEditor.collaborators.some(
    collaboratorId => collaboratorId.toString() === member._id.toString()
  );

  // ✅ FIXED: Allow OWNER, ADMIN, creator, or collaborator to execute
  const canExecute = role === 'OWNER' || role === 'ADMIN' || isCreator || isCollaborator;
  
  if (!canExecute) {
    throw new BadRequestException("You are not authorized to execute this code");
  }

  // ✅ Use code from request body OR fallback to editor content
  const codeToExecute = code || codeEditor.content;
  const languageToUse = language || codeEditor.language;

  if (!codeToExecute || !codeToExecute.trim()) {
    throw new BadRequestException("No code to execute");
  }

  // ✅ Create execution record (matching your original structure)
  const execution = new CodeExecutionModel({
    codeEditorId,
    executorId: userId,
    language: languageToUse,
    code: codeToExecute,
    input,
    workspaceId: codeEditor.workspaceId,
    status: "pending", // ✅ Use "pending" to match your original
  });

  await execution.save();

  try {
    const startTime = Date.now();

    // ✅ Execute code using your original executeByLanguage function
    const result = await executeByLanguage(
      languageToUse,
      codeToExecute,
      input,
      execution._id // Pass execution ID as in your original
    );

    console.log("✅ Execution result:", result);

    // ✅ Update execution with results (matching your original structure)
    execution.output = result.output || "";
    execution.error = result.error || "";
    execution.status = result.status || (result.error ? "failed" : "completed");
    execution.executionTime = result.executionTime || (Date.now() - startTime);
    execution.memoryUsage = result.memoryUsage || 0;
    execution.exitCode = result.exitCode;
    execution.completedAt = new Date(); // Add completion timestamp

    await execution.save();

    return { execution };

  } catch (error) {
    console.error('❌ Code execution error:', error);
    
    // ✅ Update execution record with error (matching your original)
    execution.status = "failed";
    execution.error = error.message;
    execution.executionTime = Date.now() - startTime;
    execution.completedAt = new Date();
    await execution.save();
    
    throw error;
  }
};

// ✅ Keep execution history service as is (it was working)
export const getExecutionHistoryService = async (codeEditorId, userId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // ✅ Check workspace permissions
  const { role } = await getMemberRoleInWorkspace(userId, codeEditor.workspaceId);
  
  if (!role) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const executions = await CodeExecutionModel.find({
    codeEditorId,
  })
    .populate("executorId", "name email profilePicture")
    .sort({ createdAt: -1 })
    .limit(20); // Last 20 executions

  return { executions };
};