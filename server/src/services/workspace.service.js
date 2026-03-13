import mongoose from "mongoose";
import { Roles } from "../enums/role.enum.js";
import MemberModel from "../models/Member.model.js";
import RoleModel from "../models/Role-permissions.model.js";
import UserModel from "../models/User.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { NotFoundException, BadRequestException } from "../utils/app-error.js";
import DocModel from "../models/Docs.model.js";
import WhiteboardModel from "../models/Whiteboard.model.js";
import CodeEditorModel from "../models/CodeEditor.model.js";
export const createWorkspaceService = async (userId, body) => {
  const { name, description } = body;
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundException("User not found");
  }
  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });

  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();

  user.currentWorkspace = workspace._id;

  await user.save();

  return {
    workspace,
  };
};

export const getAllWorkspacesUserIsMemberService = async (userId) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

  const workspaces = memberships.map((membership) => membership.workspaceId);

  return { workspaces };
};

export const getWorkspaceByIdService = async (workspaceId) => {
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  }).populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
};

export const getWorkspaceMembersService = async (workspaceId) => {
  const members = await MemberModel.find({
    workspaceId,
  })
    .populate("userId", "name email profilePicture")
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();
  // name: 1 - Include the name field
  // _id: 1 - Include the _id field
  // Any field not specified (or set to 0) is excluded
  // name: 1 - Include the name field
  // _id: 1 - Include the _id field
  // Any field not specified (or set to 0) is excluded

  return { members, roles };
};

export const changeMemberRoleService = async (
  workspaceId,
  memberId,
  roleId
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    throw new Error("Member not found in the workspace");
  }

  member.role = role;
  await member.save();
  // optimization needed to just store roleId in member role as ref and access whenever needed
  return {
    member,
  };
};


export const updateWorkspaceByIdService = async (
  workspaceId,
  name,
  description,
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Update the workspace details
  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;
  await workspace.save();

  return {
    workspace,
  };
};


export const deleteWorkspaceByIdService = async (workspaceId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const workspace = await WorkspaceModel.findById(workspaceId).session(
      session
    );
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    // Check if the user owns the workspace
    if (!workspace.owner.equals(new mongoose.Types.ObjectId(userId))) { 
      throw new BadRequestException(
        "You are not authorized to delete this workspace"
      );
    }

    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Delete all related documents in workspace
    await DocModel.deleteMany({ workspaceId: workspace._id }).session(session);
    await WhiteboardModel.deleteMany({ workspaceId: workspace._id }).session(session);
    await CodeEditorModel.deleteMany({ workspaceId: workspace._id }).session(session);
    
    await MemberModel.deleteMany({
      workspaceId: workspace._id,
    }).session(session);

    // Delete the workspace itself
    await WorkspaceModel.findByIdAndDelete(workspaceId).session(session);

    // Clear user's currentWorkspace if it was the deleted workspace
    if (user.currentWorkspace && user.currentWorkspace.equals(workspace._id)) {
      user.currentWorkspace = null;
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      currentWorkspace: user.currentWorkspace,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
