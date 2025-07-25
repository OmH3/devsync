import mongoose from "mongoose";

const fileSystemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["file", "folder"],
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FileSystem",
    default: null, // null for root level
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  codeEditorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CodeEditor",
    default: null, // Only for files with content, null for folders
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    size: { type: Number, default: 0 }, // File size in bytes
    extension: { type: String, default: "" }, // File extension
  },
}, {
  timestamps: true,
});

// Index for better query performance
fileSystemSchema.index({ workspaceId: 1, parentId: 1 });
fileSystemSchema.index({ path: 1, workspaceId: 1 });

const FileSystemModel = mongoose.model('FileSystem', fileSystemSchema);
export default FileSystemModel;