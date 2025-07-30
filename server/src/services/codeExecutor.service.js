import fs from "fs/promises";
import CodeExecutionModel from "../models/CodeExecution.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import MemberModel from "../models/Member.model.js";
import { executeByLanguage } from "../coderunners/scripts.runner.js";

export const executeCodeService = async (codeEditorId, userId, body) => {
  const { input = "", saveBeforeExecution = true } = body;

  // Get code editor
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  // Check if user has permission to execute
  const member = await MemberModel.findOne({
    userId,
    workspaceId: codeEditor.workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not authorized to execute this code");
  }

  const isCreator = codeEditor.creatorId.toString() === userId.toString();

  const isCollaborator = codeEditor.collaborators.some(
    collaboratorId => collaboratorId.toString() === member._id.toString()
  );

  if (!isCreator && !isCollaborator) {
    throw new BadRequestException("You are not authorized to execute this code");
  }

  // Create execution record
  const execution = new CodeExecutionModel({
    codeEditorId,
    executorId: userId,
    language: codeEditor.language,
    code: codeEditor.content,
    input,
    workspaceId: codeEditor.workspaceId,
    status: "pending",
  });

  await execution.save();

  try {
    // Execute code based on language
    const result = await executeByLanguage(
      codeEditor.language,
      codeEditor.content,
      input,
      execution._id
    );

    // Update execution with results
    execution.output = result.output || "";
    execution.error = result.error || "";
    execution.status = result.status;
    execution.executionTime = result.executionTime;
    execution.memoryUsage = result.memoryUsage || 0;
    execution.exitCode = result.exitCode;

    await execution.save();

    return { execution };
  } catch (error) {
    execution.status = "failed";
    execution.error = error.message;
    await execution.save();
    throw error;
  }
};

export const getExecutionHistoryService = async (codeEditorId, userId) => {
  const codeEditor = await CodeEditorModel.findById(codeEditorId);
  if (!codeEditor || !codeEditor.isActive) {
    throw new NotFoundException("Code editor not found");
  }

  const executions = await CodeExecutionModel.find({
    codeEditorId,
  })
    .populate("executorId", "name email profilePicture")
    .sort({ createdAt: -1 })
    .limit(20); // Last 20 executions

  return { executions };
};