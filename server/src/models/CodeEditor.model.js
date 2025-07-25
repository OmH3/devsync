import mongoose from "mongoose";


const codeEditorSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: "Untitled Code File",
  },
  content: {
    type: String,
    default: "", // Could be code in any language
  },
  language: {
    type: String,
    required: true,
    default: "javascript", // could also be "python", "cpp", etc.
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true,
  }],
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  fileSystemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FileSystem",
    required: true, // Links to the file in the file system
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  metadata: {
    lastSaved: { type: Date, default: Date.now },
    lineCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

const CodeEditorModel = mongoose.model('CodeEditor', codeEditorSchema);
export default CodeEditorModel;