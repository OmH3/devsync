import mongoose from "mongoose";

const codeExecutionSchema = new mongoose.Schema({
  codeEditorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CodeEditor",
    required: true,
  },
  executorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: ["javascript", "python","cpp"],
  },
  code: {
    type: String,
    required: true,
  },
  input: {
    type: String,
    default: "",
  },
  output: {
    type: String,
    default: "",
  },
  error: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "running", "completed", "failed", "timeout"],
    default: "pending",
  },
  executionTime: {
    type: Number, // in milliseconds
    default: 0,
  },
  memoryUsage: {
    type: Number, // in MB
    default: 0,
  },
  exitCode: {
    type: Number,
    default: null,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
}, {
  timestamps: true,
});

const CodeExecutionModel = mongoose.model('CodeExecution', codeExecutionSchema);
export default CodeExecutionModel;