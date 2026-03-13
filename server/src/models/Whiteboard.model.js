import mongoose from "mongoose";

const whiteboardSchema = new mongoose.Schema({
  boardTitle: {
    type: String,
    required: [true, "Board title is required"],
    trim: true,
    maxLength: [100, "Board title cannot exceed 100 characters"],
  },
  boardDescription: {
    type: String,
    required: false,
    trim: true,
    maxLength: [500, "Board description cannot exceed 500 characters"],
    default: "", //Add default empty string
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
  collaborators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
  ],
  boardElements: {
    type: [mongoose.Schema.Types.Mixed], // Canvas drawings, shapes, text, etc.
    default: [],
  },
  metadata: {
    elementCount: {
      type: Number,
      default: 0,
    },
    lastSaved: {
      type: Date,
      default: Date.now,
    },
    canvasSize: {
      width: {
        type: Number,
        default: 1920,
      },
      height: {
        type: Number,
        default: 1080,
      },
    },
  },
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