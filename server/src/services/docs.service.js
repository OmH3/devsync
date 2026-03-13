import DocModel from "../models/Docs.model.js";
import MemberModel from "../models/Member.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { v4 as uuidv4 } from 'uuid';
export const createDocService = async (
  userId,
  { title, content, workspaceId }
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if user is a member of the workspace
  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  });

  if (!member) {
    throw new BadRequestException("You are not a member of this workspace");
  }

  const roomId = uuidv4();

  const doc = new DocModel({
    title: title || "Untitled Document",
    content: content || "",
    creatorId: userId,
    roomId,
    workspaceId,
    collaborators: [member._id],
    lastEditedBy: userId,
  });

  await doc.save();

  // Update workspace to reference this doc if it's the first one
  if (!workspace.tools.docs.docId) {
    workspace.tools.docs.docId = doc._id;
    await workspace.save();
  }

  return { doc };
};

export const getWorkspaceDocsService = async (workspaceId) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const docs = await DocModel.find({ workspaceId, isActive: true })
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .sort({ updatedAt: -1 });

  return { docs };
};

export const getDocByIdService = async (docId) => {
  const doc = await DocModel.findById(docId)
    .populate("creatorId", "name email profilePicture")
    .populate("lastEditedBy", "name email profilePicture")
    .populate({
      path: "collaborators",
      populate: {
        path: "userId",
        select: "name email profilePicture",
      },
    });

  if (!doc) {
    throw new NotFoundException("Document not found");
  }

  return { doc };
};

export const updateDocService = async (docId, userId, { title, content }) => {
  const doc = await DocModel.findById(docId);
  if (!doc) {
    throw new NotFoundException("Document not found");
  }

  // Check if user is a collaborator
  const member = await MemberModel.findOne({
    userId,
    workspaceId: doc.workspaceId,
  });

  if (!member || !doc.collaborators.includes(member._id)) {
    throw new BadRequestException(
      "You are not authorized to edit this document"
    );
  }

  if (title !== undefined) doc.title = title;
  if (content !== undefined) {
    doc.content = content;
    doc.metadata.wordCount = content
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    doc.metadata.characterCount = content.length;
  }

  doc.lastEditedBy = userId;
  doc.metadata.lastSaved = new Date();

  await doc.save();

  return { doc };
};

export const deleteDocService = async (docId, userId) => {
    const doc = await DocModel.findById(docId);
  if (!doc) {
    throw new NotFoundException("Document not found");
  }

  // Check if user is the creator or has permission
  const member = await MemberModel.findOne({
    userId,
    workspaceId: doc.workspaceId,
  }).populate("role");

  const isCreator = doc.creatorId.toString() === userId.toString();

  if (!isCreator && !member) {
    throw new BadRequestException("You are not authorized to delete this document");
  }

  doc.isActive = false;
  // But for collaborative documents, soft delete with 
  // isActive: false is definitely the right approach! 
  await doc.save();

  return { message: "Document deleted successfully" };

}