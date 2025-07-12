import mongoose from "mongoose";
const whiteboardSchema = new mongoose.Schema({
  boardTitle: {
    type: String,
    required: [true, "Board title is required"],
    trim: true,
  },
  boardDescription: {
    type: String,
    required: false,
    trim: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
  },

  // References to Member model (includes role, user, workspace)
  collaborators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
  ],

  boardElements: [mongoose.Schema.Types.Mixed], // Canvas drawings etc.

  isActive: {
    type: Boolean,
    default: true,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true,
});

const WhiteboardModel = mongoose.model("Whiteboard", whiteboardSchema);
export default WhiteboardModel;