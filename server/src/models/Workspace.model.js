import mongoose from "mongoose";
import { generateInviteCode } from "../utils/uuid.js";

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      default: generateInviteCode,
    },
    tools: {
      docs: {
        active: { type: Boolean, default: true },
        docId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Doc",
          default: null,
        },
      },
      whiteboard: {
        active: { type: Boolean, default: true },
        boardId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Whiteboard",
          default: null,
        },
      },
      editor: {
        active: { type: Boolean, default: true },
        editorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CodeEditor",
          default: null,
        },
      },
      videoCall: {
        active: { type: Boolean, default: true },
        sessionId: { type: String, default: null }, 
      },
    },
  },
  {
    timestamps: true,
  }
);

workspaceSchema.methods.resetInviteCode = function() {
  this.inviteCode = generateInviteCode();
};

const WorkspaceModel = mongoose.model("Workspace", workspaceSchema);
export default WorkspaceModel;
