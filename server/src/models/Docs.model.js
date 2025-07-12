import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Document",
    },
    content: {
      type: String,
      default: "",
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
    isActive: {
      type: Boolean,
      default: true,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      wordCount: { type: Number, default: 0 },
      characterCount: { type: Number, default: 0 },
      lastSaved: { type: Date, default: Date.now },
    },
},
{
    timestamps: true,
}
)

const DocModel = mongoose.model('Doc', docSchema);

export default DocModel;